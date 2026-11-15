"""JD 结构化结果清洗与校验"""

from __future__ import annotations

from typing import Optional
from urllib.parse import urlparse

from .prompts import JOB_CATEGORIES
from .relevance import host_of, is_platform_host

MAX_SUMMARY = 500
MAX_LIST = 8


def _s(value, limit: int = 200) -> str:
    return str(value or "").strip()[:limit]


def _list(value, limit: int = MAX_LIST) -> list[str]:
    if not isinstance(value, list):
        return []
    out = [str(v).strip() for v in value if str(v).strip()]
    return out[:limit]


def _valid_url(url: str) -> bool:
    return url.startswith(("http://", "https://"))


def normalize_jd(data: dict, page, candidate: dict) -> Optional[dict]:
    """把 LLM 抽取结果收敛为固定结构；信息不足返回 None"""
    if not isinstance(data, dict):
        return None

    title = _s(data.get("title") or getattr(page, "title", "") or candidate.get("title"), 200)
    if not title:
        return None
    company = _s(data.get("company"), 200)

    application_url = _s(data.get("application_url"), 600)
    if not _valid_url(application_url):
        application_url = ""
        for link in getattr(page, "apply_links", []) or []:
            if _valid_url(link.get("url", "")):
                application_url = link["url"]
                break

    category = _s(data.get("category"), 20)
    if category not in JOB_CATEGORIES:
        category = "其他"

    jd = {
        "title": title,
        "company": company,
        "location": _s(data.get("location"), 120),
        "salary": _s(data.get("salary"), 120),
        "experience_required": _s(data.get("experience_required"), 120),
        "education_required": _s(data.get("education_required"), 120),
        "summary": _s(data.get("summary"), MAX_SUMMARY),
        "responsibilities": _list(data.get("responsibilities")),
        "requirements": _list(data.get("requirements")),
        "preferred": _list(data.get("preferred")),
        "skills": _list(data.get("skills"), 20),
        "interview_focus": _list(data.get("interview_focus"), 5),
        "category": category,
        "application_url": application_url,
    }
    if is_empty_jd(jd):
        return None
    return jd


def is_empty_jd(jd: dict) -> bool:
    """与 lq-agent 一致的「空 JD」判定：列表全空且标量全无（title 总会被回填，不计）"""
    lists = ("responsibilities", "requirements", "preferred", "skills")
    if any(jd.get(key) for key in lists):
        return False
    scalars = ("salary", "experience_required", "education_required", "location", "summary")
    return not any(jd.get(key) for key in scalars)


def job_source(url: str) -> str:
    host = host_of(url)
    if is_platform_host(host):
        return "platform"
    if host:
        return "official"
    return "unknown"


def apply_url_of(jd: dict, page, candidate: dict) -> str:
    if _valid_url(jd.get("application_url", "")):
        return jd["application_url"]
    for link in getattr(page, "apply_links", []) or []:
        if _valid_url(link.get("url", "")):
            return link["url"]
    url = candidate.get("url") or ""
    return url if _valid_url(url) else ""


def host_label(url: str) -> str:
    return urlparse(url).netloc.lower()
