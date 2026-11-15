"""JD 页面抓取：JSON-LD → 容器选择器 → meta → 全页正文（移植自 lq-agent jd_service.py）"""

from __future__ import annotations

import ipaddress
import json
import logging
import socket
from dataclasses import dataclass, field
from typing import Any, Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from .config import JD_MAX_CHARS, MAX_BODY_BYTES, REQUEST_TIMEOUT, USER_AGENT
from .relevance import (
    host_of,
    is_apply_link_intent,
    is_ats_host,
    looks_like_apply_path,
)

logger = logging.getLogger(__name__)

# 招聘网站 JD 正文容器选择器候选（命中优先于整页正文）
JD_CONTAINER_SELECTORS = [
    ".job-detail",
    ".job-description",
    ".jd-detail",
    ".job-sec-text",
    ".text-desc",
    ".describtion",
    ".position-info",
    ".content-word",
    ".job-detail-content",
    ".job-box",
    ".job-info",
    "#job-detail",
    "#jobDescription",
    "article",
    "main",
]

APPLY_LINK_MAX = 30


@dataclass
class JdPage:
    title: str = ""
    text: str = ""
    apply_links: list[dict] = field(default_factory=list)


class FetchError(Exception):
    """页面抓取失败或内容不可用"""


def _is_private_host(host: str) -> bool:
    h = (host or "").lower().strip(".")
    if h in ("localhost", "host.docker.internal", "0.0.0.0"):
        return True
    parts = h.split(".")
    if len(parts) == 4 and all(p.isdigit() for p in parts):
        a, b = int(parts[0]), int(parts[1])
        if a == 0 or a == 10 or a == 127:
            return True
        if a == 172 and 16 <= b <= 31:
            return True
        if a == 192 and b == 168:
            return True
        if a == 169 and b == 254:
            return True
    return False


def validate_url(url: str) -> None:
    """SSRF 防护：只允许 http/https 公网地址（含 DNS 解析后的 IP 检查）"""
    parsed = urlparse(url or "")
    if parsed.scheme not in ("http", "https"):
        raise FetchError("URL 必须以 http:// 或 https:// 开头")
    host = parsed.hostname or ""
    if not host or _is_private_host(host):
        raise FetchError("拒绝抓取本机或内网地址")
    try:
        infos = socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80))
    except OSError:
        return  # 解析失败交给 httpx 报错
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
        except ValueError:
            continue
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise FetchError("拒绝抓取内网地址")


def _headers(url: str) -> dict:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
    }
    parsed = urlparse(url)
    if parsed.scheme and parsed.netloc:
        headers["Referer"] = f"{parsed.scheme}://{parsed.netloc}/"
    return headers


def _meta_content(soup: BeautifulSoup, prop: str) -> str:
    tag = soup.find("meta", attrs={"property": prop}) or soup.find("meta", attrs={"name": prop})
    content = tag.get("content") if tag else ""
    return content.strip() if isinstance(content, str) else ""


def _walk_jsonld(node: Any):
    if isinstance(node, dict):
        yield node
        for value in node.values():
            yield from _walk_jsonld(value)
    elif isinstance(node, list):
        for item in node:
            yield from _walk_jsonld(item)


def _jsonld_apply_url(item: dict) -> str:
    contact = item.get("applicationContact")
    if isinstance(contact, dict):
        value = contact.get("url")
        if isinstance(value, str) and value.strip().startswith(("http://", "https://")):
            return value.strip()
        if isinstance(value, dict) and isinstance(value.get("href"), str):
            href = value["href"].strip()
            if href.startswith(("http://", "https://")):
                return href
    direct = item.get("directApply")
    if isinstance(direct, str) and direct.strip().startswith(("http://", "https://")):
        return direct.strip()
    return ""


def _jd_container_text(soup: BeautifulSoup) -> str:
    best = ""
    for selector in JD_CONTAINER_SELECTORS:
        for node in soup.select(selector):
            text = node.get_text(separator="\n", strip=True)
            if len(text) > len(best):
                best = text
    return best if len(best) >= 30 else ""


def _collect_apply_links(soup: BeautifulSoup, base_url: str) -> list[dict]:
    candidates: list[dict] = []
    seen: set[str] = set()
    for anchor in soup.find_all("a", href=True):
        href = (anchor.get("href") or "").strip()
        if not href or href.startswith(("#", "javascript:", "mailto:", "tel:")):
            continue
        abs_url = urljoin(base_url, href)
        if not abs_url.startswith(("http://", "https://")):
            continue
        key = abs_url.split("#")[0]
        if key in seen:
            continue
        anchor_text = anchor.get_text(separator=" ", strip=True)[:60]
        path = urlparse(abs_url).path
        if not (
            is_apply_link_intent(anchor_text)
            or is_ats_host(host_of(abs_url))
            or looks_like_apply_path(path)
        ):
            continue
        seen.add(key)
        candidates.append({"url": abs_url, "text": anchor_text, "source": "anchor"})
        if len(candidates) >= APPLY_LINK_MAX:
            break
    return candidates


def fetch_jd(url: str) -> JdPage:
    """抓取并提取 JD 正文，返回标题/正文/投递链接候选（同步）"""
    validate_url(url)
    try:
        with httpx.Client(
            timeout=REQUEST_TIMEOUT,
            follow_redirects=True,
            headers=_headers(url),
        ) as client:
            resp = client.get(url)
            resp.raise_for_status()
    except httpx.TimeoutException as exc:
        raise FetchError("抓取网页超时") from exc
    except httpx.HTTPStatusError as exc:
        raise FetchError(f"HTTP {exc.response.status_code}") from exc
    except httpx.RequestError as exc:
        raise FetchError("网络错误") from exc

    raw_bytes = resp.content or b""
    if len(raw_bytes) > MAX_BODY_BYTES:
        raw_bytes = raw_bytes[:MAX_BODY_BYTES]
    html = raw_bytes.decode(resp.encoding or "utf-8", errors="replace")
    soup = BeautifulSoup(html, "html.parser")

    title = soup.title.string.strip() if soup.title and soup.title.string else ""
    og_title = _meta_content(soup, "og:title")
    if og_title:
        title = og_title
    og_desc = _meta_content(soup, "og:description")

    texts: list[str] = []
    jsonld_apply_url = ""
    for script in soup.find_all("script", type="application/ld+json"):
        raw = script.get_text(strip=True)
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        for item in _walk_jsonld(data):
            if not isinstance(item, dict):
                continue
            description = item.get("description")
            if not isinstance(description, str) or not description.strip():
                continue
            if item.get("@type") in ("JobPosting", "JobPostingNew"):
                texts.insert(0, description)
                if item.get("title") and not title:
                    title = str(item["title"])
                jsonld_apply_url = _jsonld_apply_url(item) or jsonld_apply_url
            elif len(description.strip()) > 200:
                texts.append(description)

    if texts:
        clean = [
            BeautifulSoup(t, "html.parser").get_text(separator="\n", strip=True) for t in texts
        ]
        text = "\n".join(clean)
    else:
        text = _jd_container_text(soup)
    if not text and og_desc and len(og_desc.strip()) >= 10:
        text = og_desc.strip()
    if not text:
        for tag in soup(["script", "style", "nav", "footer", "aside", "header", "form"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        text = "\n".join(line for line in text.split("\n") if line.strip())

    if len(text) > JD_MAX_CHARS:
        text = text[:JD_MAX_CHARS] + "\n...(内容过长，已截断)"

    apply_links: list[dict] = []
    if jsonld_apply_url:
        apply_links.append(
            {
                "url": jsonld_apply_url,
                "text": "JSON-LD applicationContact/directApply",
                "source": "jsonld",
            }
        )
    for candidate in _collect_apply_links(soup, url):
        if candidate["url"] != jsonld_apply_url:
            apply_links.append(candidate)

    return JdPage(title=title, text=text, apply_links=apply_links)


def fetch_concurrently(urls: list[str], limit: int = 3) -> list[tuple[str, Optional[JdPage], str]]:
    """并发抓取，返回 [(url, page|None, error)]，顺序与输入一致"""
    from concurrent.futures import ThreadPoolExecutor

    def _one(u: str):
        try:
            return u, fetch_jd(u), ""
        except FetchError as exc:
            return u, None, str(exc)
        except Exception as exc:  # noqa: BLE001
            logger.warning("抓取异常: %s", type(exc).__name__)
            return u, None, type(exc).__name__

    with ThreadPoolExecutor(max_workers=max(1, limit)) as pool:
        return list(pool.map(_one, urls))
