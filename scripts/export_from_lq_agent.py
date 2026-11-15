#!/usr/bin/env python3
"""
从本机 lq-agent 导出个人资料（简历 + 知识库）为加密 profile.enc.json

前置：lq-agent 正在运行（默认 http://localhost:8083），且知道 user_id：
    docker exec lq-postgres psql -U lqagent -d lq_agent -c "select id, username from users"

用法：
    set SITE_PASSWORD=你的密码
    python scripts/export_from_lq_agent.py --user-id 1 \
        --keywords "AI应用开发,AI产品经理" --city "杭州,上海"

输出：
    web/public/data/profile.enc.json   加密个人资料（可提交）
    web/public/data/digest.enc.json    空 digest（首次运行时由每日管线覆盖）
    data/profile.json                  明文（gitignore，调试用，默认不写）

隐私：不导出手机号/邮箱/原始简历全文/头像/LLM Key。
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

import httpx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from crypto import CryptoError, read_encrypted, write_encrypted  # noqa: E402
from pipeline.digest import new_digest  # noqa: E402

DATA_DIR = ROOT / "web" / "public" / "data"
PROFILE_PATH = DATA_DIR / "profile.enc.json"
DIGEST_PATH = DATA_DIR / "digest.enc.json"
PLAIN_PATH = ROOT / "data" / "profile.json"

SECTION_BY_TYPE = {
    "project": "projects",
    "work": "work",
    "education": "education",
    "award": "awards",
    "certificate": "certificates",
    "publication": "publications",
    "portfolio": "portfolio",
}

RESUME_SECTION_BY_KEY = {
    "projects": "projects",
    "work_experience": "work",
    "education": "education",
    "awards": "awards",
    "certificates": "certificates",
    "publications": "publications",
    "portfolio": "portfolio",
}

DEEP_DIVE_LABELS = {
    "business_problem": "业务问题",
    "success_criteria": "成功标准",
    "input_output": "输入输出",
    "original_solution": "原有方案",
    "personal_role": "个人角色",
    "key_constraints": "关键约束",
    "solution_choice": "方案选择",
    "quality_evidence": "质量证据",
    "failure_cases": "失败案例",
    "evidence_location": "证据位置",
}


def now_cst_iso() -> str:
    try:
        from zoneinfo import ZoneInfo

        return datetime.now(ZoneInfo("Asia/Shanghai")).isoformat(timespec="seconds")
    except Exception:  # noqa: BLE001
        return datetime.now(timezone(timedelta(hours=8))).isoformat(timespec="seconds")


def norm_key(value: str) -> str:
    return re.sub(r"\s+", "", str(value or "")).lower()


def http_get(base_url: str, path: str, **params) -> Any:
    url = base_url.rstrip("/") + path
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.get(url, params=params)
    except httpx.RequestError as exc:
        raise SystemExit(
            f"无法连接 lq-agent（{base_url}）：请先启动应用。原始错误：{type(exc).__name__}"
        ) from exc
    if resp.status_code >= 400:
        raise SystemExit(f"接口 {path} 返回 HTTP {resp.status_code}: {resp.text[:200]}")
    return resp.json()


def fetch_kb(base_url: str, user_id: int) -> list[dict]:
    data = http_get(base_url, "/agent/kb/entries", user_id=user_id)
    return data.get("items") or []


def fetch_resumes(base_url: str, user_id: int, mode: str) -> list[dict]:
    listing = http_get(base_url, "/agent/resume/list", user_id=user_id).get("items") or []
    done = [r for r in listing if r.get("status") == "done"]
    if not done:
        return []
    if mode in ("", "latest"):
        chosen = done[:1]
    else:
        chosen = [r for r in done if str(r.get("id")) == str(mode)]
        if not chosen:
            raise SystemExit(f"没有找到 id={mode} 且解析成功的简历")
    details = []
    for item in chosen:
        detail = http_get(base_url, f"/agent/resume/{item['id']}", user_id=user_id)
        details.append(detail)
    return details


def _line(label: str, value: Any) -> str:
    text = str(value or "").strip()
    return f"{label}：{text}" if text else ""


def _dates(start: Any, end: Any) -> str:
    a, b = str(start or "").strip(), str(end or "").strip()
    if a and b:
        return f"{a} ~ {b}"
    return a or b


def _flatten(content: dict, entry_type: str) -> list[str]:
    lines: list[str] = []
    if entry_type == "project":
        lines += [content.get("description", "")]
        tech = content.get("tech_stack") or []
        if tech:
            lines.append("技术栈：" + "、".join(str(t) for t in tech))
        lines += [str(h) for h in (content.get("highlights") or [])]
        for key, label in DEEP_DIVE_LABELS.items():
            if content.get(key):
                lines.append(_line(label, content[key]))
    elif entry_type == "work":
        header = " · ".join(
            x for x in (content.get("position"), _dates(content.get("start_date"), content.get("end_date"))) if x
        )
        if header:
            lines.append(header)
        if content.get("description"):
            lines.append(str(content["description"]))
    elif entry_type == "education":
        header = " · ".join(
            x
            for x in (
                content.get("major"),
                content.get("degree"),
                _dates(content.get("start_date"), content.get("end_date")),
            )
            if x
        )
        if header:
            lines.append(header)
        if content.get("description"):
            lines.append(str(content["description"]))
    elif entry_type == "award":
        header = " · ".join(x for x in (content.get("level"), content.get("date"), content.get("issuer")) if x)
        if header:
            lines.append(header)
        if content.get("description"):
            lines.append(str(content["description"]))
    elif entry_type == "certificate":
        header = " · ".join(x for x in (content.get("issuer"), content.get("date")) if x)
        if header:
            lines.append(header)
        if content.get("description"):
            lines.append(str(content["description"]))
    elif entry_type == "publication":
        header = " · ".join(x for x in (content.get("venue"), content.get("date")) if x)
        if header:
            lines.append(header)
        if content.get("authors"):
            lines.append("作者：" + str(content["authors"]))
        if content.get("description"):
            lines.append(str(content["description"]))
    elif entry_type == "portfolio":
        header = " · ".join(x for x in (content.get("kind"), content.get("role"), content.get("date")) if x)
        if header:
            lines.append(header)
        if content.get("description"):
            lines.append(str(content["description"]))
        lines += [str(h) for h in (content.get("highlights") or [])]
    elif entry_type == "self_evaluation":
        lines.append(str(content.get("summary") or ""))
    return [line.strip() for line in lines if str(line).strip()]


def kb_items(entries: list[dict]) -> tuple[dict[str, list[dict]], Optional[str]]:
    sections: dict[str, list[dict]] = {key: [] for key in sorted(set(SECTION_BY_TYPE.values()))}
    self_eval = None
    for entry in entries:
        entry_type = entry.get("entry_type") or ""
        content = entry.get("content") or {}
        if entry_type == "self_evaluation":
            self_eval = entry.get("content", {}).get("summary") or self_eval
            continue
        section = SECTION_BY_TYPE.get(entry_type)
        if not section:
            continue
        title = str(entry.get("title") or content.get("name") or content.get("company") or "条目")
        lines = _flatten(content, entry_type)
        if not lines:
            continue
        sections[section].append(
            {
                "key": _item_key(section, content, title),
                "title": title,
                "lines": lines,
                "source": "kb",
                "tech": list(content.get("tech_stack") or []),
                "highlights": list(content.get("highlights") or []),
            }
        )
    return sections, self_eval


def resume_items(resumes: list[dict]) -> dict[str, list[dict]]:
    sections: dict[str, list[dict]] = {key: [] for key in sorted(set(SECTION_BY_TYPE.values()))}
    for resume in resumes:
        parsed = resume.get("parsed_data") or {}
        for resume_key, section in RESUME_SECTION_BY_KEY.items():
            for raw in parsed.get(resume_key) or []:
                if not isinstance(raw, dict):
                    continue
                entry_type = {
                    "projects": "project",
                    "work": "work",
                    "education": "education",
                    "awards": "award",
                    "certificates": "certificate",
                    "publications": "publication",
                    "portfolio": "portfolio",
                }[section]
                title = (
                    raw.get("name")
                    or raw.get("company")
                    or raw.get("school")
                    or raw.get("title")
                    or "条目"
                )
                lines = _flatten(raw, entry_type)
                if not lines:
                    continue
                sections[section].append(
                    {
                        "key": _item_key(section, raw, title),
                        "title": str(title),
                        "lines": lines,
                        "source": "resume",
                        "tech": list(raw.get("tech_stack") or []),
                        "highlights": list(raw.get("highlights") or []),
                    }
                )
    return sections


def _item_key(section: str, content: dict, title: str) -> str:
    if section == "work":
        return norm_key(f"{content.get('company', '')}{content.get('position', '')}{title}")
    if section == "education":
        return norm_key(f"{content.get('school', '')}{content.get('degree', '')}{title}")
    return norm_key(title)


def merge_sections(kb: dict[str, list[dict]], resume: dict[str, list[dict]]) -> dict[str, list[dict]]:
    merged: dict[str, list[dict]] = {}
    for section in kb:
        bucket: dict[str, dict] = {}
        for item in kb.get(section, []) + resume.get(section, []):
            key = item["key"] or norm_key(item["title"])
            if key not in bucket:
                bucket[key] = {
                    "title": item["title"],
                    "lines": list(item["lines"]),
                    "sources": [item["source"]],
                    "tech": list(item.get("tech") or []),
                    "highlights": list(item.get("highlights") or []),
                }
                continue
            current = bucket[key]
            for line in item["lines"]:
                if line not in current["lines"]:
                    current["lines"].append(line)
            if item["source"] not in current["sources"]:
                current["sources"].append(item["source"])
            for tech in item.get("tech") or []:
                if tech not in current["tech"]:
                    current["tech"].append(tech)
            for highlight in item.get("highlights") or []:
                if highlight not in current["highlights"]:
                    current["highlights"].append(highlight)
        merged[section] = [
            {
                "id": f"{section}-{i}",
                "kind": section,
                "title": value["title"],
                "sources": value["sources"],
                "lines": value["lines"][:30],
                "text": "\n".join(value["lines"][:30]),
                "_tech": value["tech"],
                "_highlights": value["highlights"],
            }
            for i, value in enumerate(bucket.values(), 1)
        ]
    return merged


def dedupe_strings(values: list[str], limit: int) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        text = str(value or "").strip()
        if not text or text in seen:
            continue
        seen.add(text)
        out.append(text)
        if len(out) >= limit:
            break
    return out


def build_profile(
    kb_entries: list[dict],
    resumes: list[dict],
    keywords: list[str],
    cities: list[str],
    exclude_companies: list[str],
    top_n: int,
) -> dict:
    kb_sections, self_eval = kb_items(kb_entries)
    resume_sections = resume_items(resumes)
    sections = merge_sections(kb_sections, resume_sections)

    parsed = (resumes[0].get("parsed_data") or {}) if resumes else {}
    skills = list(parsed.get("skills") or [])
    for section in ("projects", "portfolio"):
        for item in sections.get(section, []):
            skills.extend(item.get("_tech") or [])
    skills = dedupe_strings(skills, 60)

    summary = str(parsed.get("summary") or "").strip() or str(self_eval or "").strip()
    name = str(parsed.get("name") or "").strip()

    target_titles = keywords or []
    if not target_titles and parsed.get("work_experience"):
        first = parsed["work_experience"][0] or {}
        if first.get("position"):
            target_titles = [str(first["position"])]

    queries: list[dict] = []
    for idx, keyword in enumerate(target_titles[:2]):
        city = cities[idx] if idx < len(cities) else (cities[0] if cities else "")
        queries.append({"keywords": keyword, "city": city})

    for section in sections.values():
        for item in section:
            item.pop("_tech", None)
            item.pop("_highlights", None)

    return {
        "schemaVersion": 1,
        "generatedAt": now_cst_iso(),
        "search": {
            "queries": queries,
            "excludeCompanies": exclude_companies,
            "topN": top_n,
        },
        "meta": {
            "name": name,
            "yearsOfExperience": str(parsed.get("years_of_experience") or ""),
            "summary": summary,
        },
        "sections": sections,
        "matchProfile": {
            "skills": skills,
            "targetTitles": target_titles,
            "summary": summary[:800],
        },
    }


def count_items(profile: dict) -> dict:
    return {section: len(items) for section, items in profile.get("sections", {}).items() if items}


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="从 lq-agent 导出个人资料并加密")
    parser.add_argument("--base-url", default="http://localhost:8083")
    parser.add_argument("--user-id", type=int, required=True)
    parser.add_argument("--resume", default="latest", help="latest 或简历 id")
    parser.add_argument("--keywords", default="", help="目标岗位关键词，逗号分隔（最多 2 个）")
    parser.add_argument("--city", default="", help="城市，逗号分隔")
    parser.add_argument("--exclude-companies", default="", help="排除公司，逗号分隔")
    parser.add_argument("--top-n", type=int, default=5)
    parser.add_argument("--password-env", default="SITE_PASSWORD")
    parser.add_argument("--plain-out", default="", help="额外写出明文 JSON（不要提交）")
    parser.add_argument("--show-llm", action="store_true", help="打印当前 LLM base_url / model（不含 Key）")
    parser.add_argument("--dry-run", action="store_true", help="只拉取并统计，不写文件")
    args = parser.parse_args(argv)

    password = os.environ.get(args.password_env, "")
    if not password.strip():
        raise SystemExit(f"请先设置环境变量 {args.password_env}")

    keywords = [k.strip() for k in args.keywords.split(",") if k.strip()]
    cities = [c.strip() for c in args.city.split(",") if c.strip()]
    excludes = [c.strip() for c in args.exclude_companies.split(",") if c.strip()]

    kb_entries = fetch_kb(args.base_url, args.user_id)
    resumes = fetch_resumes(args.base_url, args.user_id, args.resume)
    if not resumes:
        print("警告：没有解析成功的简历，将只用知识库内容生成 profile")

    profile = build_profile(kb_entries, resumes, keywords, cities, excludes, args.top_n)
    counts = count_items(profile)
    print(f"知识库条目 {len(kb_entries)} 条；简历 {len(resumes)} 份")
    print(f"合并后板块：{json.dumps(counts, ensure_ascii=False)}")
    print(f"技能 {len(profile['matchProfile']['skills'])} 个；目标岗位 {profile['matchProfile']['targetTitles']}")

    if args.show_llm:
        try:
            cfg = http_get(args.base_url, "/agent/user/llm-config", user_id=args.user_id)
            print(f"当前 LLM base_url={cfg.get('baseUrl')} model={cfg.get('model')}（Key 不导出）")
        except SystemExit as exc:
            print(f"读取 LLM 配置失败：{exc}")

    if args.dry_run:
        print("dry-run：未写文件")
        return 0

    if not profile["search"]["queries"]:
        print("警告：search.queries 为空，每日管线将无法运行；请用 --keywords 指定目标岗位")

    write_encrypted(PROFILE_PATH, profile, password)

    # 每次导出 profile 都会换新 salt；digest 必须同步复用新的 KDF，
    # 否则浏览器用同一把派生密钥无法解密 digest。
    _, new_kdf = read_encrypted(PROFILE_PATH, password)
    if DIGEST_PATH.exists():
        try:
            existing_digest, _ = read_encrypted(DIGEST_PATH, password)
        except CryptoError:
            existing_digest = new_digest(now_cst_iso()[:10])
        write_encrypted(DIGEST_PATH, existing_digest, password, kdf=new_kdf)
        print(f"已更新 digest 的加密参数 -> {DIGEST_PATH}")
    else:
        write_encrypted(
            DIGEST_PATH, new_digest(now_cst_iso()[:10]), password, kdf=new_kdf
        )
        print(f"已初始化空 digest -> {DIGEST_PATH}")

    if args.plain_out:
        PLAIN_PATH.parent.mkdir(parents=True, exist_ok=True)
        PLAIN_PATH.write_text(
            json.dumps(profile, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"已写出明文（勿提交）-> {PLAIN_PATH}")

    print(f"已加密 -> {PROFILE_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
