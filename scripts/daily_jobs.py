#!/usr/bin/env python3
"""
每日岗位推荐管线（GitHub Actions 中运行，无数据库、无 FastAPI）

流程：
  解密 profile → 两路 Tavily 搜索 → 去重 → LLM 粗筛 → 抓取 JD
  → LLM 结构化 → LLM 匹配打分（失败降级启发式）→ 企业微信推送
  → 加密写回 digest.enc.json + meta.json

日志卫生：public 仓库的 Actions 日志是公开的，这里只打印计数与异常类型，
绝不打印公司/岗位/技能/URL/解密内容。

用法：
  python scripts/daily_jobs.py                 # 正式运行（推送+提交数据由 workflow 负责）
  python scripts/daily_jobs.py --dry-run       # 不写文件、不推送
  python scripts/daily_jobs.py --no-push       # 写文件但不推送
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from crypto import read_encrypted, write_encrypted  # noqa: E402
from pipeline.config import ConfigError, RunConfig  # noqa: E402
from pipeline.dedupe import filter_seen, mark_seen, prune_seen, dedupe_batch  # noqa: E402
from pipeline.digest import (  # noqa: E402
    merge_jobs,
    new_digest,
    prune_digest,
    to_digest_job,
    utc_now_iso,
)
from pipeline.fetch import fetch_concurrently  # noqa: E402
from pipeline.jd import normalize_jd  # noqa: E402
from pipeline.llm import LlmClient, LlmError  # noqa: E402
from pipeline.match import match_job, select_top  # noqa: E402
from pipeline.prompts import (  # noqa: E402
    DISCOVERY_FILTER_SYSTEM_PROMPT,
    JD_EXTRACT_SYSTEM_PROMPT,
    build_filter_prompt,
    build_jd_extract_prompt,
)
from pipeline.relevance import norm_token, relevance  # noqa: E402
from pipeline.search import SearchUnavailable, extract_rendered, make_client, search_two_route  # noqa: E402
from pipeline.wechat import WeChatError, render_markdown, send  # noqa: E402

DATA_DIR = ROOT / "web" / "public" / "data"
PROFILE_PATH = DATA_DIR / "profile.enc.json"
DIGEST_PATH = DATA_DIR / "digest.enc.json"
META_PATH = DATA_DIR / "meta.json"

logger = logging.getLogger("daily")


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )
    # 第三方库的日志可能带 URL，压到 WARNING 以下不输出细节
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("tavily").setLevel(logging.WARNING)


def now_cst() -> datetime:
    try:
        from zoneinfo import ZoneInfo

        return datetime.now(ZoneInfo("Asia/Shanghai"))
    except Exception:  # noqa: BLE001 - Windows 无 tzdata 时回退固定 UTC+8
        return datetime.now(timezone(timedelta(hours=8)))


def load_profile(password: str) -> tuple[dict, dict]:
    if not PROFILE_PATH.exists():
        raise ConfigError(
            "缺少 profile.enc.json：请先运行 scripts/export_from_lq_agent.py 导出个人资料"
        )
    payload, kdf = read_encrypted(PROFILE_PATH, password)
    if not isinstance(payload, dict) or payload.get("schemaVersion") != 1:
        raise ConfigError("profile.enc.json 结构不支持")
    return payload, kdf


def load_digest(password: str, run_date: str) -> dict:
    if not DIGEST_PATH.exists():
        return new_digest(run_date)
    payload, _ = read_encrypted(DIGEST_PATH, password)
    if not isinstance(payload, dict) or payload.get("schemaVersion") != 1:
        raise ConfigError("digest.enc.json 结构不支持")
    return payload


def build_queries(profile: dict) -> list[dict]:
    queries = (profile.get("search") or {}).get("queries") or []
    cleaned: list[dict] = []
    for item in queries[:2]:
        keywords = str((item or {}).get("keywords") or "").strip()
        city = str((item or {}).get("city") or "").strip()
        if keywords:
            cleaned.append({"keywords": keywords, "city": city})
    return cleaned


def coarse_filter(llm: LlmClient, keywords: str, city: str, items: list[dict]) -> list[dict]:
    if not items:
        return []
    try:
        data = llm.chat_json(
            DISCOVERY_FILTER_SYSTEM_PROMPT,
            build_filter_prompt(keywords, city, items),
            max_tokens=1024,
        )
        keep = {
            int(i)
            for i in (data.get("keep") or [])
            if isinstance(i, (int, str)) and str(i).isdigit()
        }
        kept = [item for idx, item in enumerate(items) if idx in keep]
        # LLM 全淘汰通常意味着偷懒，回退为全量（后续抓取会自然过滤）
        return kept or items
    except (LlmError, ValueError, AttributeError) as exc:
        logger.warning("LLM 粗筛失败，回退全量: %s", type(exc).__name__)
        return items


def run(cfg: RunConfig) -> int:
    run_date = now_cst().strftime("%Y-%m-%d")
    now_iso = utc_now_iso()
    today = date.fromisoformat(run_date)

    profile, profile_kdf = load_profile(cfg.password)
    digest = load_digest(cfg.password, run_date)
    seen = prune_seen(digest.get("seen") or {}, today)

    queries = build_queries(profile)
    if not queries:
        raise ConfigError("profile.search.queries 为空：导出时请提供 --keywords")

    tavily = make_client(cfg.tavily_key)
    llm = LlmClient(cfg.llm_base_url, cfg.llm_key, cfg.llm_model)
    top_n = int((profile.get("search") or {}).get("topN") or cfg.top_n)

    excluded = {
        norm_token(x)
        for x in ((profile.get("search") or {}).get("excludeCompanies") or [])
        if str(x).strip()
    }

    # ---------- 搜索与去重 ----------
    searched = 0
    candidates: list[dict] = []
    try:
        for query in queries:
            text = f"{query['keywords']} 招聘" + (f" {query['city']}" if query["city"] else "")
            results = search_two_route(tavily, text)
            searched += len(results)
            fresh = filter_seen(dedupe_batch(results), seen, today)
            fresh.sort(
                key=lambda r: relevance(query["keywords"], query["city"], r), reverse=True
            )
            candidates.extend(fresh)
    except SearchUnavailable as exc:
        logger.error("搜索不可用，今日不生成推荐")
        _notify_error(cfg, "搜索服务不可用，今日未生成推荐")
        raise

    candidates = dedupe_batch(candidates)
    if excluded:
        candidates = [
            c
            for c in candidates
            if not any(token in norm_token(f"{c.get('title', '')} {c.get('content', '')[:80]}") for token in excluded)
        ]
    candidates = candidates[: cfg.max_candidates]
    logger.info("搜索完成：原始结果 %d 条，去重后候选 %d 条", searched, len(candidates))

    # ---------- LLM 粗筛 ----------
    if candidates and queries:
        candidates = coarse_filter(llm, queries[0]["keywords"], queries[0]["city"], candidates)
        logger.info("粗筛后候选 %d 条", len(candidates))

    # ---------- 抓取 + 结构化 + 匹配 ----------
    to_fetch = candidates[: cfg.max_fetch]
    fetched = fetch_concurrently(
        [c.get("url", "") for c in to_fetch], limit=cfg.fetch_concurrency
    )

    allow_llm = True
    llm_failures = 0
    new_jobs: list[dict] = []
    degraded: list[str] = []

    for (url, page, error), candidate in zip(fetched, to_fetch):
        if page is None:
            mark_seen(seen, "", candidate.get("title", ""), url, run_date, reason="failed")
            logger.info("抓取失败（%s），已记录 7 天内不再重试", error or "未知错误")
            continue

        if len(page.text.strip()) < 30:
            title, rendered = extract_rendered(tavily, url)
            if len(rendered) > len(page.text):
                page.text = rendered[:12000]
                page.title = page.title or title

        if len(page.text.strip()) < 30:
            mark_seen(seen, "", candidate.get("title", ""), url, run_date, reason="failed")
            logger.info("页面正文不足，跳过")
            continue

        jd = None
        if allow_llm:
            try:
                raw = llm.chat_json(
                    JD_EXTRACT_SYSTEM_PROMPT,
                    build_jd_extract_prompt(page.text, page.apply_links),
                    max_tokens=2000,
                )
                jd = normalize_jd(raw, page, candidate)
            except (LlmError, ValueError):
                llm_failures += 1
                logger.warning("JD 结构化失败（连续 %d 次）", llm_failures)
                if llm_failures >= 2:
                    allow_llm = False
                    degraded.append("llm_unavailable")
        if jd is None:
            mark_seen(seen, "", candidate.get("title", ""), url, run_date, reason="failed")
            continue

        match = match_job(llm if allow_llm else None, profile, jd)
        if match.get("source") == "heuristic" and "heuristic_match" not in degraded:
            degraded.append("heuristic_match")

        candidate["_page"] = page
        new_jobs.append(to_digest_job(candidate, jd, match, run_date, now_iso))
        mark_seen(
            seen,
            jd.get("company", ""),
            jd.get("title", ""),
            url,
            run_date,
            reason="stored",
        )

    logger.info("抓取 %d 条，成功结构化并打分 %d 条", len(to_fetch), len(new_jobs))

    # ---------- 推送 ----------
    pushed_count = 0
    push_error = False
    existing_ids = {j.get("id") for j in digest.get("jobs", [])}
    fresh_jobs = [j for j in new_jobs if j["id"] not in existing_ids or not _already_pushed(digest, j["id"])]
    push_jobs = select_top(fresh_jobs, top_n)

    if push_jobs and cfg.push and not cfg.dry_run:
        if not cfg.webhook_url:
            logger.warning("未配置 WECHAT_WEBHOOK_URL，跳过推送")
        else:
            status = "ok" if not degraded else "degraded"
            content = render_markdown(push_jobs, run_date, cfg.site_url, status=status)
            try:
                send(cfg.webhook_url, content)
                pushed_count = len(push_jobs)
                for job in push_jobs:
                    job["pushed"] = True
                logger.info("企业微信推送成功：%d 条", pushed_count)
            except WeChatError as exc:
                push_error = True
                logger.error("企业微信推送失败: %s", exc)
    elif push_jobs:
        logger.info("跳过推送（dry-run / --no-push），本应有 %d 条", len(push_jobs))

    # ---------- 落库 ----------
    added = merge_jobs(digest, new_jobs)
    prune_digest(digest, today, cfg.keep_days)
    digest["generatedAt"] = now_iso
    digest["runDate"] = run_date
    digest["seen"] = seen
    digest["run"] = {
        "status": "ok" if not degraded else "degraded",
        "counts": {
            "searched": searched,
            "newCandidates": len(candidates),
            "fetched": len(to_fetch),
            "matched": len(new_jobs),
            "pushed": pushed_count,
        },
        "degradedReasons": degraded,
    }

    meta = {
        "schemaVersion": 1,
        "lastRunAt": now_iso,
        "runDate": run_date,
        "status": digest["run"]["status"],
        "newJobs": added,
        "totalJobs": len(digest.get("jobs", [])),
        "degradedReasons": degraded,
    }

    if cfg.write and not cfg.dry_run:
        write_encrypted(DIGEST_PATH, digest, cfg.password, kdf=profile_kdf)
        tmp = META_PATH.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        os.replace(tmp, META_PATH)
        logger.info("已写入 digest.enc.json / meta.json（今日新增 %d，共 %d）", added, meta["totalJobs"])
    else:
        logger.info("dry-run：未写入文件（今日新增 %d，共 %d）", added, meta["totalJobs"])

    return 1 if push_error else 0


def _already_pushed(digest: dict, job_id: str) -> bool:
    for job in digest.get("jobs", []):
        if job.get("id") == job_id:
            return bool(job.get("pushed"))
    return False


def _notify_error(cfg: RunConfig, message: str) -> None:
    if not (cfg.push and not cfg.dry_run and cfg.webhook_url):
        return
    try:
        send(cfg.webhook_url, f"## 求职雷达运行失败\n> {message}")
    except WeChatError:
        pass


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="每日岗位推荐管线")
    parser.add_argument("--dry-run", action="store_true", help="不写文件、不推送")
    parser.add_argument("--no-push", action="store_true", help="写文件但不推送")
    parser.add_argument("--no-write", action="store_true", help="不写文件")
    parser.add_argument("--max-fetch", type=int)
    parser.add_argument("--top-n", type=int)
    args = parser.parse_args(argv)

    setup_logging()
    try:
        cfg = RunConfig.from_env()
    except ConfigError as exc:
        logger.error("配置错误: %s", exc)
        return 2

    cfg.dry_run = args.dry_run
    cfg.push = not (args.no_push or args.dry_run)
    cfg.write = not (args.no_write or args.dry_run)
    if args.max_fetch:
        cfg.max_fetch = args.max_fetch
    if args.top_n:
        cfg.top_n = args.top_n

    try:
        return run(cfg)
    except ConfigError as exc:
        logger.error("运行终止: %s", exc)
        return 2
    except Exception as exc:  # noqa: BLE001
        logger.error("运行失败: %s: %s", type(exc).__name__, exc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
