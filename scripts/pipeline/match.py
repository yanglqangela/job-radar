"""岗位匹配打分：LLM 优先，失败降级为技能重叠启发式"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from .llm import LlmClient, LlmError
from .prompts import RESUME_MATCH_SYSTEM_PROMPT, build_match_prompt
from .relevance import norm_token

logger = logging.getLogger(__name__)


def _as_str_list(value: Any, limit: int = 8) -> list[str]:
    if not isinstance(value, list):
        return []
    out = [str(v).strip() for v in value if str(v).strip()]
    return out[:limit]


def normalize_match(data: Any, source: str) -> dict:
    if not isinstance(data, dict):
        raise ValueError("匹配结果不是 JSON 对象")
    try:
        score = int(round(float(data.get("score", 0))))
    except (TypeError, ValueError):
        score = 0
    score = max(0, min(100, score))
    return {
        "score": score,
        "summary": str(data.get("summary") or "").strip()[:400],
        "matchedSkills": _as_str_list(data.get("matched_skills")),
        "missingSkills": _as_str_list(data.get("missing_skills")),
        "advantages": _as_str_list(data.get("advantages")),
        "gaps": _as_str_list(data.get("gaps")),
        "suggestions": _as_str_list(data.get("suggestions")),
        "source": source,
    }


def build_match_profile(profile: dict) -> dict:
    """给 LLM 的候选人画像：只含匹配必需字段，控制提示词长度"""
    match_profile = profile.get("matchProfile") or {}
    sections = profile.get("sections") or {}
    projects = []
    for item in (sections.get("projects") or [])[:4]:
        projects.append(
            {
                "名称": item.get("title", ""),
                "要点": (item.get("lines") or [])[:6],
            }
        )
    work = []
    for item in (sections.get("work") or [])[:3]:
        work.append({"公司": item.get("title", ""), "要点": (item.get("lines") or [])[:4]})
    return {
        "目标岗位": (match_profile.get("targetTitles") or [])[:6],
        "技能": (match_profile.get("skills") or [])[:40],
        "概述": str(match_profile.get("summary") or "")[:600],
        "项目": projects,
        "工作经历": work,
    }


def heuristic_match(profile: dict, jd: dict) -> dict:
    """LLM 不可用时的确定性兜底：profile 技能 vs JD 文本的重合率"""
    match_profile = profile.get("matchProfile") or {}
    skills = [str(s).strip() for s in (match_profile.get("skills") or []) if str(s).strip()]
    jd_parts = [
        str(jd.get("title") or ""),
        " ".join(str(s) for s in (jd.get("skills") or [])),
        " ".join(str(s) for s in (jd.get("requirements") or [])),
        " ".join(str(s) for s in (jd.get("responsibilities") or [])),
        str(jd.get("summary") or ""),
    ]
    jd_text = norm_token(" ".join(jd_parts))
    matched = [s for s in skills if norm_token(s) and norm_token(s) in jd_text]
    missing = [
        str(s)
        for s in (jd.get("skills") or [])
        if str(s).strip() and norm_token(s) not in norm_token(" ".join(skills))
    ][:6]
    ratio = len(matched) / max(1, len(skills))
    score = int(round(max(40, min(90, 45 + 50 * ratio))))
    summary = f"技能重合 {len(matched)}/{len(skills)}（启发式打分）" if skills else "缺少技能画像（启发式打分）"
    return {
        "score": score,
        "summary": summary,
        "matchedSkills": matched[:8],
        "missingSkills": missing,
        "advantages": matched[:3],
        "gaps": missing[:3],
        "suggestions": [],
        "source": "heuristic",
    }


def llm_match(client: LlmClient, profile: dict, jd: dict) -> dict:
    compact_profile = build_match_profile(profile)
    prompt = build_match_prompt(
        json.dumps(compact_profile, ensure_ascii=False),
        json.dumps(jd, ensure_ascii=False),
    )
    data = client.chat_json(RESUME_MATCH_SYSTEM_PROMPT, prompt, max_tokens=1200)
    return normalize_match(data, source="llm")


def match_job(
    client: Optional[LlmClient],
    profile: dict,
    jd: dict,
    allow_llm: bool = True,
) -> dict:
    if allow_llm and client is not None:
        try:
            return llm_match(client, profile, jd)
        except (LlmError, ValueError) as exc:
            logger.warning("LLM 匹配失败，降级为启发式: %s", type(exc).__name__)
    return heuristic_match(profile, jd)


def select_top(jobs: list[dict], n: int) -> list[dict]:
    """按匹配分排序，取前 n（分数相同保持先到先得）"""
    ordered = sorted(jobs, key=lambda j: (j.get("match", {}).get("score", 0), j.get("firstSeenAt", "")), reverse=True)
    return ordered[:n]
