"""Tavily 搜索与渲染抓取（两路召回 + 失败重试）"""

from __future__ import annotations

import logging
import time
from typing import Optional

from tavily import TavilyClient

from .config import SEARCH_DEPTH, SEARCH_MAX_RESULTS
from .relevance import PLATFORM_DOMAINS

logger = logging.getLogger(__name__)


class SearchUnavailable(Exception):
    """两路搜索都失败"""


def make_client(api_key: str) -> TavilyClient:
    return TavilyClient(api_key=api_key)


def _search_route(client: TavilyClient, query: str, **kwargs) -> Optional[list[dict]]:
    """单路搜索，失败重试一次；两次都失败返回 None"""
    for attempt in range(2):
        try:
            resp = client.search(query=query, search_depth=SEARCH_DEPTH, **kwargs)
            return resp.get("results") or []
        except Exception as exc:  # noqa: BLE001 - 第三方库异常类型不稳定
            if attempt == 0:
                logger.warning("Tavily 路线失败，2s 后重试: %s", type(exc).__name__)
                time.sleep(2)
            else:
                logger.warning("Tavily 路线重试仍失败: %s", type(exc).__name__)
    return None


def search_two_route(
    client: TavilyClient,
    query: str,
    max_results: int = SEARCH_MAX_RESULTS,
) -> list[dict]:
    """
    双路搜索：A 路不限域名（官网/校招页/内推帖），B 路限定招聘平台域名。
    任一路有结果即返回；两路都失败才抛 SearchUnavailable。
    """
    raw: list[dict] = []
    succeeded = False
    routes = (
        dict(max_results=max_results),
        dict(max_results=max_results, include_domains=list(PLATFORM_DOMAINS)),
    )
    for kwargs in routes:
        results = _search_route(client, query, **kwargs)
        if results is not None:
            succeeded = True
            raw.extend(results)
    if not succeeded:
        raise SearchUnavailable("Tavily 搜索不可用")
    return [r for r in raw if (r.get("url") or "").strip()]


def extract_rendered(client: TavilyClient, url: str) -> tuple[str, str]:
    """JS 渲染页兜底：Tavily extract 返回 (title, text)，失败返回空"""
    try:
        result = client.extract(urls=[url], include_raw_content=False)
        items = result.get("results") or []
        if not items:
            return "", ""
        item = items[0]
        text = (item.get("raw_content") or item.get("content") or "").strip()
        title = (item.get("title") or "").strip()
        return title, text
    except Exception as exc:  # noqa: BLE001
        logger.warning("Tavily extract 失败: %s", type(exc).__name__)
        return "", ""
