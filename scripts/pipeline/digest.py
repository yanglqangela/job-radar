"""digest 数据结构：稳定 id、合并、裁剪"""

from __future__ import annotations

import hashlib
from datetime import date, datetime, timedelta
from typing import Any

from .dedupe import url_key
from .jd import apply_url_of, job_source

DIGEST_SCHEMA_VERSION = 1


def job_id(url: str) -> str:
    """稳定 id：同一 URL 跨天不变，收藏/已投标记才不会丢"""
    digest = hashlib.sha256(url_key(url).encode("utf-8")).hexdigest()[:12]
    return f"j_{digest}"


def new_digest(run_date: str) -> dict:
    return {
        "schemaVersion": DIGEST_SCHEMA_VERSION,
        "generatedAt": "",
        "runDate": run_date,
        "run": {
            "status": "ok",
            "counts": {"searched": 0, "newCandidates": 0, "fetched": 0, "matched": 0, "pushed": 0},
            "degradedReasons": [],
        },
        "jobs": [],
        "seen": {},
    }


def to_digest_job(
    candidate: dict,
    jd: dict,
    match: dict,
    run_date: str,
    now_iso: str,
) -> dict:
    url = candidate.get("url") or ""
    return {
        "id": job_id(url),
        "date": run_date,
        "firstSeenAt": now_iso,
        "title": jd["title"],
        "company": jd["company"],
        "location": jd["location"],
        "salary": jd["salary"],
        "category": jd["category"],
        "url": url,
        "applyUrl": apply_url_of(jd, candidate.get("_page"), candidate),
        "source": job_source(url),
        "summary": jd["summary"],
        "skills": jd["skills"],
        "responsibilities": jd["responsibilities"],
        "requirements": jd["requirements"],
        "match": match,
        "pushed": False,
    }


def merge_jobs(digest: dict, new_jobs: list[dict]) -> int:
    """按稳定 id 合并；已存在则保留 firstSeenAt，用新数据刷新其余字段"""
    existing = {j.get("id"): j for j in digest.get("jobs", [])}
    added = 0
    for job in new_jobs:
        old = existing.get(job["id"])
        if old:
            old.update({k: v for k, v in job.items() if k not in ("firstSeenAt", "pushed")})
            old["pushed"] = old.get("pushed") or job.get("pushed", False)
        else:
            digest.setdefault("jobs", []).append(job)
            added += 1
    return added


def prune_digest(digest: dict, today: date, keep_days: int) -> None:
    cutoff = (today - timedelta(days=keep_days)).isoformat()
    digest["jobs"] = [j for j in digest.get("jobs", []) if (j.get("date") or "") >= cutoff]


def pushed_job_ids(digest: dict) -> set[str]:
    return {j.get("id") for j in digest.get("jobs", []) if j.get("pushed")}


def utc_now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def count_by_status(digest: dict) -> dict:
    jobs = digest.get("jobs", [])
    return {"total": len(jobs), "pushed": sum(1 for j in jobs if j.get("pushed"))}


def safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default
