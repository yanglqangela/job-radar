"""企业微信群机器人推送（markdown，4096 字节硬上限）"""

from __future__ import annotations

import logging
import time

import httpx

logger = logging.getLogger(__name__)

MAX_BYTES = 4096
BUDGET_BYTES = 3900  # 留余量
RATE_LIMIT_ERRCODE = 45009
INVALID_WEBHOOK_ERRCODE = 93000


class WeChatError(Exception):
    pass


def utf8_len(text: str) -> int:
    return len(text.encode("utf-8"))


def _clean(text: str, limit: int) -> str:
    """去掉换行与 markdown 结构字符，避免破坏消息格式"""
    cleaned = (text or "").replace("\n", " ").replace("\r", " ").strip()
    for ch in ("**", "[", "]", "`"):
        cleaned = cleaned.replace(ch, "")
    return cleaned[:limit]


def _score_tag(score: int) -> str:
    return f"{score}分"


def render_markdown(
    jobs: list[dict],
    run_date: str,
    site_url: str = "",
    status: str = "ok",
) -> str:
    """按字节预算从低分职位开始丢弃，绝不截断 URL"""
    kept = list(jobs)
    while True:
        lines: list[str] = []
        if status != "ok":
            lines.append("> 今日抓取降级完成，部分职位为启发式匹配")
        lines.append(f"## 今日职位推荐 · {run_date[5:]}")
        lines.append(f"> 从最新搜索结果中精选 {len(kept)} 条")
        lines.append("")

        for idx, job in enumerate(kept, 1):
            match = job.get("match") or {}
            score = int(match.get("score") or 0)
            title = _clean(job.get("title", ""), 60)
            company = _clean(job.get("company", ""), 40) or "查看详情"
            location = _clean(job.get("location", ""), 30)
            url = (job.get("applyUrl") or job.get("url") or "").strip()
            url = url.replace(" ", "%20").replace("(", "%28").replace(")", "%29")
            matched = "、".join(_clean(s, 12) for s in (match.get("matchedSkills") or [])[:3])
            missing = "、".join(_clean(s, 12) for s in (match.get("missingSkills") or [])[:3])
            reason = _clean(match.get("summary", ""), 80)

            lines.append(f"**{idx}. {title} · {_score_tag(score)}**")
            line = f"[{company}]({url})" if url else company
            if location:
                line += f" · {location}"
            lines.append(line)
            tags = []
            if matched:
                tags.append(f"匹配：{matched}")
            if missing:
                tags.append(f"缺：{missing}")
            if tags:
                lines.append(f'<font color="comment">{"；".join(tags)}</font>')
            if reason:
                lines.append(f"> {reason}")
            lines.append("")

        if site_url:
            lines.append(f"[在网页中查看全部]({site_url})")

        content = "\n".join(lines).strip()
        if utf8_len(content) <= BUDGET_BYTES:
            return content
        if not kept:
            raise WeChatError("消息内容超出企业微信字节上限")
        kept = kept[:-1]  # 丢弃分数最低的（jobs 已按分数排序）


def send(webhook_url: str, content: str, timeout: float = 10.0) -> None:
    if not webhook_url:
        raise WeChatError("未配置企业微信 webhook")
    payload = {"msgtype": "markdown", "markdown": {"content": content}}
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with httpx.Client(timeout=timeout) as client:
                resp = client.post(webhook_url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            errcode = data.get("errcode", 0)
            if errcode == 0:
                return
            if errcode == RATE_LIMIT_ERRCODE:
                logger.warning("企业微信限频，60s 后重试")
                time.sleep(60)
                continue
            if errcode == INVALID_WEBHOOK_ERRCODE:
                raise WeChatError("企业微信 webhook 无效")
            raise WeChatError(f"企业微信返回错误 {errcode}: {data.get('errmsg', '')}")
        except WeChatError:
            raise
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning("企业微信推送失败（第 %d 次）: %s", attempt + 1, type(exc).__name__)
            time.sleep(2 * (attempt + 1))
    raise WeChatError(f"企业微信推送失败: {type(last_error).__name__ if last_error else 'unknown'}")
