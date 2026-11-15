"""URL / 公司+岗位 去重（移植自 lq-agent job_discovery_service.py）"""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta

from .relevance import norm_token

SEEN_TTL_STORED_DAYS = 60
SEEN_TTL_FAILED_DAYS = 7
SEEN_MAX_KEYS = 2000


def url_key(url: str) -> str:
    """去掉 query/fragment 与尾部斜杠，作为稳定的 URL 归一化键"""
    return re.sub(r"[\?&#].*$", "", (url or "").strip()).rstrip("/")


def candidate_keys(company: str, title: str, url: str) -> list[str]:
    keys: list[str] = []
    norm = url_key(url)
    if norm:
        keys.append(f"url:{norm}")
    ct, pt = norm_token(company), norm_token(title)
    if ct and pt:
        keys.append(f"tc:{ct}:{pt}")
    return keys


def dedupe_batch(raw: list[dict]) -> list[dict]:
    """批内 URL 去重（保留首个），只留 http(s)"""
    seen: set[str] = set()
    merged: list[dict] = []
    for item in raw:
        url = (item.get("url") or "").strip()
        if not url.startswith(("http://", "https://")):
            continue
        key = url_key(url)
        if not key or key in seen:
            continue
        seen.add(key)
        merged.append(item)
    return merged


def _is_expired(entry: dict, today: date) -> bool:
    try:
        day = datetime.strptime(entry.get("d", ""), "%Y-%m-%d").date()
    except ValueError:
        return False
    ttl = SEEN_TTL_FAILED_DAYS if entry.get("r") == "failed" else SEEN_TTL_STORED_DAYS
    return today - day > timedelta(days=ttl)


def prune_seen(seen: dict[str, dict], today: date, cap: int = SEEN_MAX_KEYS) -> dict[str, dict]:
    """清掉过期键，并按日期保留最近的 cap 个"""
    alive = {k: v for k, v in seen.items() if not _is_expired(v, today)}
    if len(alive) > cap:
        ordered = sorted(alive.items(), key=lambda kv: kv[1].get("d", ""), reverse=True)
        alive = dict(ordered[:cap])
    return alive


def is_seen(item: dict, seen: dict[str, dict], today: date) -> bool:
    """URL 命中，或公司+岗位 token 都命中（跨站点同岗位变体）"""
    url = (item.get("url") or "").strip()
    if f"url:{url_key(url)}" in seen:
        return True
    title = f"{item.get('title', '')} {item.get('content', '')[:100]}"
    norm_title = norm_token(title)
    for key in seen:
        if not key.startswith("tc:"):
            continue
        try:
            _, comp, pos = key.split(":", 2)
        except ValueError:
            continue
        if comp and pos and comp in norm_title and pos in norm_title:
            return True
    return False


def filter_seen(
    candidates: list[dict], seen: dict[str, dict], today: date
) -> list[dict]:
    return [c for c in candidates if not is_seen(c, seen, today)]


def mark_seen(
    seen: dict[str, dict],
    company: str,
    title: str,
    url: str,
    day: str,
    reason: str = "stored",
) -> None:
    for key in candidate_keys(company, title, url):
        seen[key] = {"d": day, "r": reason}
