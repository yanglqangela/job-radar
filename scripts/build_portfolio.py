#!/usr/bin/env python3
"""把作品集内容与可选的简历导出合并成公开的 portfolio.json。

输入：
  content/portfolio.json   手写内容（tracked）
  data/profile.json        可选，export_from_lq_agent.py --plain-out 的产物（gitignored）

输出：
  web/public/data/portfolio.json   公开、明文、allowlist 后的数据（tracked）

隐私：这里不读取密码，也不 import crypto.py；所有自由文本会去掉手机号、邮箱、
座机、身份证和 QQ/微信标识。公开邮箱只来自 contact.email 显式字段。
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CONTENT_PATH = ROOT / "content" / "portfolio.json"
PROFILE_PATH = ROOT / "data" / "profile.json"
OUT_PATH = ROOT / "web" / "public" / "data" / "portfolio.json"
PUBLIC_DIR = ROOT / "web" / "public"

ASSET_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"}
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
PERIOD_RE = re.compile(
    r"(?:19|20)\d{2}\s*[./-]\s*\d{1,2}\s*[-–—~至]\s*"
    r"(?:(?:19|20)\d{2}\s*[./-]\s*\d{1,2}|至今|present|now)",
    re.IGNORECASE,
)
PII_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"), "[已隐藏]"),
    (re.compile(r"(?i)(?:qq|微信|wechat|wx)\s*(?:号|id)?\s*[:：]?\s*[A-Za-z0-9_-]{5,}"), "[已隐藏]"),
    (re.compile(r"(?<!\d)(?:\+?86[\s-]?)?1[3-9]\d{9}(?!\d)"), "[已隐藏]"),
    (re.compile(r"(?<!\d)0\d{2,3}[\s-]?\d{7,8}(?!\d)"), "[已隐藏]"),
    (re.compile(r"(?<!\d)\d{17}[\dXx](?!\d)"), "[已隐藏]"),
]


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def sanitize_scalar(value: Any) -> str:
    """只做空白与控制字符清理，不替换邮箱等显式字段。"""
    text = str(value or "")
    return text.replace(" ", " ").replace("\r\n", "\n").replace("\r", "\n").strip()


def redact(text: Any) -> str:
    value = sanitize_scalar(text)
    for pattern, replacement in PII_PATTERNS:
        value = pattern.sub(replacement, value)
    return value


def clean(value: Any) -> Any:
    """递归清洗字符串，保留结构。"""
    if isinstance(value, str):
        return redact(value)
    if isinstance(value, list):
        return [clean(item) for item in value]
    if isinstance(value, dict):
        return {str(key): clean(item) for key, item in value.items()}
    return value


def clean_lines(values: Iterable[Any]) -> list[str]:
    lines: list[str] = []
    for value in values or []:
        text = redact(value)
        if text and text not in lines:
            lines.append(text)
    return lines


def norm_key(value: Any) -> str:
    return re.sub(r"[\s·・,，。.;；:：()（）/\\-]+", "", redact(value)).lower()


def valid_email(value: Any) -> str:
    email = sanitize_scalar(value)
    return email if EMAIL_RE.fullmatch(email) else ""


def valid_url(value: Any) -> str:
    url = sanitize_scalar(value)
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https", "mailto"}:
        return ""
    if parsed.scheme != "mailto" and not parsed.netloc:
        return ""
    return url


def build_links(raw_links: Any, warnings: list[str], strict: bool) -> list[dict[str, str]]:
    links: list[dict[str, str]] = []
    for raw in raw_links or []:
        if not isinstance(raw, dict):
            continue
        label = redact(raw.get("label"))
        url = valid_url(raw.get("url"))
        if not label or not url:
            message = f"忽略无效链接：{label or raw}"
            if strict:
                raise ValueError(message)
            warnings.append(message)
            continue
        links.append({"label": label, "url": url})
    return links


def build_screenshots(
    raw_shots: Any,
    public_dir: Path,
    warnings: list[str],
    strict: bool,
) -> list[dict[str, str]]:
    shots: list[dict[str, str]] = []
    for raw in raw_shots or []:
        if not isinstance(raw, dict):
            continue
        src = redact(raw.get("src")).replace("\\", "/")
        problem = ""
        if not src:
            problem = "缺少 src"
        elif src.startswith("/") or "://" in src:
            problem = f"截图路径必须是相对路径：{src}"
        elif any(part == ".." for part in Path(src).parts):
            problem = f"截图路径不能包含 ..：{src}"
        elif Path(src).suffix.lower() not in ASSET_EXTENSIONS:
            problem = f"截图扩展名不支持：{src}"
        elif not (public_dir / src).is_file():
            problem = f"截图文件不存在：{src}"
        if problem:
            if strict:
                raise ValueError(problem)
            warnings.append(problem)
            continue
        shots.append(
            {
                "src": src,
                "alt": redact(raw.get("alt")) or "",
                "caption": redact(raw.get("caption")) or "",
            }
        )
    return shots


def override_for(table: Any, title: str) -> dict[str, Any]:
    if not isinstance(table, dict):
        return {}
    key = norm_key(title)
    for raw_key, value in table.items():
        if norm_key(raw_key) == key and isinstance(value, dict):
            return value
    return {}


def timeline_key(item: dict[str, Any]) -> str:
    return norm_key(f"{item.get('org', '')}{item.get('role', '')}")


def parse_profile_item(item: dict[str, Any], section: str) -> dict[str, Any]:
    title = redact(item.get("title"))
    lines = clean_lines(item.get("lines") or [])
    header = lines[0] if lines else ""
    parts = [part.strip() for part in header.split(" · ") if part.strip()]
    period = ""
    rest: list[str] = []
    for part in parts:
        if PERIOD_RE.search(part):
            period = part
        else:
            rest.append(part)
    bullets = lines[1:]

    if section == "work":
        return {
            "kind": "work",
            "period": period,
            "org": title,
            "role": " · ".join(rest),
            "bullets": bullets,
        }
    if section == "education":
        return {
            "kind": "education",
            "period": period,
            "org": title,
            "role": " · ".join(rest),
            "bullets": bullets,
        }
    return {"kind": section, "title": title, "meta": header, "detail": " ".join(bullets)}


def apply_override(item: dict[str, Any], override: dict[str, Any]) -> bool:
    """返回 False 表示该条目应隐藏。"""
    if not override:
        return True
    if override.get("hidden"):
        return False
    if "role" in override:
        item["role"] = redact(override["role"])
    if "period" in override:
        item["period"] = redact(override["period"])
    if "bullets" in override:
        item["bullets"] = clean_lines(override["bullets"])
    if "tags" in override:
        item["tags"] = clean_lines(override["tags"])
    if "title" in override:
        item["title"] = redact(override["title"])
    return True


def build_timeline(
    content: dict[str, Any],
    profile: dict[str, Any] | None,
    warnings: list[str],
    strict: bool,
) -> dict[str, Any]:
    raw_timeline = content.get("timeline") or {}
    items: list[dict[str, Any]] = []
    compact: list[dict[str, Any]] = []
    overrides = content.get("overrides") or {}

    for raw in raw_timeline.get("items") or []:
        if not isinstance(raw, dict):
            continue
        item = {
            "kind": redact(raw.get("kind")) or "work",
            "period": redact(raw.get("period")),
            "org": redact(raw.get("org")),
            "role": redact(raw.get("role")),
            "roleEn": redact(raw.get("roleEn")),
            "location": redact(raw.get("location")),
            "bullets": clean_lines(raw.get("bullets") or []),
            "tags": clean_lines(raw.get("tags") or []),
        }
        table = overrides.get(item["kind"], {})
        if not apply_override(item, override_for(table, item.get("org") or item.get("title", ""))):
            continue
        if not (item["org"] or item.get("title")):
            continue
        items.append({key: value for key, value in item.items() if value})

    for raw in raw_timeline.get("compactItems") or []:
        if not isinstance(raw, dict):
            continue
        item = {
            "kind": redact(raw.get("kind")) or "award",
            "title": redact(raw.get("title")),
            "meta": redact(raw.get("meta")),
        }
        if not item["title"]:
            continue
        compact.append(item)

    if profile:
        sections = profile.get("sections") or {}
        used = {timeline_key(item) for item in items}
        used_compact = {norm_key(item.get("title")) for item in compact}

        for section in ("work", "education"):
            for raw in sections.get(section) or []:
                if not isinstance(raw, dict):
                    continue
                title = redact(raw.get("title"))
                mapped = parse_profile_item(raw, section)
                if not mapped.get("org"):
                    continue
                if not apply_override(mapped, override_for(overrides.get(section), title)):
                    continue
                key = timeline_key(mapped)
                if key in used:
                    continue
                used.add(key)
                items.append({k: v for k, v in mapped.items() if v})

        for section in ("awards", "certificates"):
            for raw in sections.get(section) or []:
                if not isinstance(raw, dict):
                    continue
                title = redact(raw.get("title"))
                if not title or norm_key(title) in used_compact:
                    continue
                if not apply_override({}, override_for(overrides.get(section), title)):
                    continue
                used_compact.add(norm_key(title))
                compact.append(parse_profile_item(raw, section))

    return {
        "title": redact(raw_timeline.get("title")) or "经历",
        "titleEn": redact(raw_timeline.get("titleEn")) or "Experience",
        "items": items,
        "compactItems": compact,
    }


def build_projects(
    content: dict[str, Any],
    public_dir: Path,
    warnings: list[str],
    strict: bool,
) -> list[dict[str, Any]]:
    overrides = (content.get("overrides") or {}).get("projects") or {}
    projects: list[dict[str, Any]] = []
    seen: set[str] = set()

    for raw in content.get("projects") or []:
        if not isinstance(raw, dict):
            continue
        slug = redact(raw.get("slug"))
        if not SLUG_RE.fullmatch(slug):
            message = f"项目 slug 不合法：{slug or '(空)'}"
            if strict:
                raise ValueError(message)
            warnings.append(message)
            continue
        if slug in seen:
            message = f"项目 slug 重复：{slug}"
            if strict:
                raise ValueError(message)
            warnings.append(message)
            continue
        if not apply_override({}, override_for(overrides, slug)) or override_for(
            overrides, slug
        ).get("hidden"):
            continue
        if not apply_override({}, override_for(overrides, raw.get("name", ""))):
            continue

        decisions: list[dict[str, str]] = []
        for decision in raw.get("decisions") or []:
            if not isinstance(decision, dict):
                continue
            title = redact(decision.get("title"))
            detail = redact(decision.get("detail"))
            if title and detail:
                decisions.append({"title": title, "detail": detail})

        metrics: list[dict[str, str]] = []
        for metric in raw.get("metrics") or []:
            if not isinstance(metric, dict):
                continue
            value = redact(metric.get("value"))
            label = redact(metric.get("label"))
            if value and label:
                metrics.append({"value": value, "label": label})

        project = {
            "slug": slug,
            "name": redact(raw.get("name")),
            "nameEn": redact(raw.get("nameEn")),
            "year": redact(raw.get("year")),
            "pitch": redact(raw.get("pitch")),
            "problem": redact(raw.get("problem")),
            "role": redact(raw.get("role")),
            "decisions": decisions,
            "stack": clean_lines(raw.get("stack") or []),
            "highlights": clean_lines(raw.get("highlights") or []),
            "metrics": metrics,
            "links": build_links(raw.get("links"), warnings, strict),
            "screenshots": build_screenshots(raw.get("screenshots"), public_dir, warnings, strict),
        }
        if not project["name"] or not project["pitch"]:
            message = f"项目 {slug} 缺少 name 或 pitch"
            if strict:
                raise ValueError(message)
            warnings.append(message)
            continue
        seen.add(slug)
        projects.append(project)

    return projects


def build_skills(
    content: dict[str, Any],
    project_slugs: set[str],
    warnings: list[str],
    strict: bool,
) -> dict[str, Any]:
    raw_skills = content.get("skills") or {}
    groups: list[dict[str, Any]] = []
    for raw_group in raw_skills.get("groups") or []:
        if not isinstance(raw_group, dict):
            continue
        items: list[dict[str, str]] = []
        for raw_item in raw_group.get("items") or []:
            if not isinstance(raw_item, dict):
                continue
            name = redact(raw_item.get("name"))
            if not name:
                continue
            evidence = redact(raw_item.get("evidence"))
            if evidence and evidence not in project_slugs:
                message = f"技能「{name}」的 evidence 指向不存在的项目：{evidence}"
                if strict:
                    raise ValueError(message)
                warnings.append(message)
                evidence = ""
            items.append({"name": name, "evidence": evidence} if evidence else {"name": name})
        if items:
            groups.append(
                {
                    "name": redact(raw_group.get("name")) or "其他",
                    "nameEn": redact(raw_group.get("nameEn")),
                    "items": items,
                }
            )
    return {
        "title": redact(raw_skills.get("title")) or "技能",
        "titleEn": redact(raw_skills.get("titleEn")) or "Skills",
        "groups": groups,
    }


def build_portfolio(
    content: dict[str, Any],
    profile: dict[str, Any] | None = None,
    public_dir: Path = PUBLIC_DIR,
    strict: bool = False,
) -> tuple[dict[str, Any], list[str]]:
    warnings: list[str] = []

    if content.get("schemaVersion") != 1:
        raise ValueError("content/portfolio.json 的 schemaVersion 必须是 1")

    projects = build_projects(content, public_dir, warnings, strict)
    slugs = {project["slug"] for project in projects}

    contact_raw = content.get("contact") or {}
    email = valid_email(contact_raw.get("email"))
    if not email:
        message = "contact.email 为空或格式不对，页面不会显示邮箱"
        if strict:
            raise ValueError(message)
        warnings.append(message)

    identity = clean(content.get("identity") or {})
    if not identity.get("name"):
        raise ValueError("identity.name 不能为空")

    data: dict[str, Any] = {
        "schemaVersion": 1,
        "contentUpdatedAt": redact(content.get("updatedAt")),
        "identity": identity,
        "contact": {
            **({"email": email} if email else {}),
            "links": build_links(contact_raw.get("links"), warnings, strict),
        },
        "hero": clean(content.get("hero") or {}),
        "timeline": build_timeline(content, profile, warnings, strict),
        "projects": projects,
        "skills": build_skills(content, slugs, warnings, strict),
        "seo": clean(content.get("seo") or {}),
        "workspace": clean(content.get("workspace") or {}),
    }
    if profile and profile.get("generatedAt"):
        data["profileGeneratedAt"] = redact(profile.get("generatedAt"))

    return data, warnings


def write_json_atomic(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    try:
        with tmp.open("w", encoding="utf-8", newline="\n") as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            tmp.unlink()


PROJECTION_KEYS = (
    "schemaVersion",
    "contentUpdatedAt",
    "identity",
    "contact",
    "hero",
    "projects",
    "skills",
    "seo",
    "workspace",
)


def projection_diff(built: dict[str, Any], existing: dict[str, Any]) -> list[str]:
    diffs = [key for key in PROJECTION_KEYS if built.get(key) != existing.get(key)]
    built_timeline = built.get("timeline") or {}
    existing_timeline = existing.get("timeline") or {}
    for key in ("title", "titleEn"):
        if built_timeline.get(key) != existing_timeline.get(key):
            diffs.append(f"timeline.{key}")
    return diffs


def full_diff(built: dict[str, Any], existing: dict[str, Any]) -> list[str]:
    keys = sorted(set(built) | set(existing))
    return [key for key in keys if built.get(key) != existing.get(key)]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="生成公开作品集 JSON")
    parser.add_argument("--content", type=Path, default=CONTENT_PATH)
    parser.add_argument("--profile", type=Path, default=PROFILE_PATH)
    parser.add_argument("--out", type=Path, default=OUT_PATH)
    parser.add_argument("--public-dir", type=Path, default=PUBLIC_DIR, help="web/public 目录，用于校验截图")
    parser.add_argument("--content-only", action="store_true", help="不合并 data/profile.json")
    parser.add_argument("--validate-only", action="store_true", help="只校验，不写文件")
    parser.add_argument("--check", action="store_true", help="与已提交输出比对，过期则失败")
    parser.add_argument("--strict", action="store_true", help="警告也视为失败")
    args = parser.parse_args(argv)

    content = load_json(args.content)
    profile_path: Path | None = None if args.content_only else args.profile
    profile = None
    if profile_path and profile_path.is_file():
        profile = load_json(profile_path)
    elif profile_path and not args.check:
        print(f"提示：未找到 {profile_path}，只生成手写内容。", file=sys.stderr)

    if args.check:
        if not args.out.is_file():
            print(f"缺少 {args.out}，请先运行 build_portfolio.py", file=sys.stderr)
            return 1
        existing = load_json(args.out)
        built, warnings = build_portfolio(
            content, profile, public_dir=args.public_dir, strict=args.strict
        )
        for warning in warnings:
            print(f"警告：{warning}", file=sys.stderr)
        diffs = full_diff(built, existing) if profile else projection_diff(built, existing)
        if diffs:
            print(f"作品集输出已过期：{', '.join(diffs)}", file=sys.stderr)
            return 1
        print("作品集输出与内容一致。")
        return 0

    if (
        args.out.is_file()
        and not profile
        and not args.content_only
        and load_json(args.out).get("profileGeneratedAt")
    ):
        print(
            "已提交的作品集包含简历导出的经历；请传 --profile，"
            "或显式使用 --content-only（会丢掉这些条目）。",
            file=sys.stderr,
        )
        return 2

    built, warnings = build_portfolio(content, profile, public_dir=args.public_dir, strict=args.strict)
    for warning in warnings:
        print(f"警告：{warning}", file=sys.stderr)

    if args.validate_only:
        print(
            f"校验通过：{len(built['projects'])} 个项目，"
            f"{len(built['timeline']['items'])} 条经历，"
            f"{len(built['skills']['groups'])} 组技能。"
        )
        return 0

    write_json_atomic(args.out, built)
    print(
        f"已写入 {args.out}：{len(built['projects'])} 个项目，"
        f"{len(built['timeline']['items'])} 条经历，"
        f"{len(built['skills']['groups'])} 组技能。"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
