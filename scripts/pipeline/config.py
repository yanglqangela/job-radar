"""每日管线配置（只从环境变量读取，不落盘、不打印敏感值）"""

from __future__ import annotations

import os
from dataclasses import dataclass


class ConfigError(Exception):
    """缺少或非法的配置"""


DEFAULT_LLM_BASE_URL = "https://api.deepseek.com"
DEFAULT_LLM_MODEL = "deepseek-chat"
DEFAULT_TOP_N = 5
DEFAULT_MAX_FETCH = 8
DEFAULT_MAX_CANDIDATES = 30
DEFAULT_KEEP_DAYS = 30
DEFAULT_FETCH_CONCURRENCY = 3

SEARCH_DEPTH = "advanced"
SEARCH_MAX_RESULTS = 15
JD_MAX_CHARS = 12_000
MAX_BODY_BYTES = 2_000_000
REQUEST_TIMEOUT = 15.0
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        value = int(raw)
    except ValueError as exc:
        raise ConfigError(f"{name} 必须是整数") from exc
    if value <= 0:
        raise ConfigError(f"{name} 必须大于 0")
    return value


@dataclass
class RunConfig:
    password: str
    tavily_key: str
    llm_key: str
    webhook_url: str = ""
    llm_base_url: str = DEFAULT_LLM_BASE_URL
    llm_model: str = DEFAULT_LLM_MODEL
    site_url: str = ""
    max_candidates: int = DEFAULT_MAX_CANDIDATES
    max_fetch: int = DEFAULT_MAX_FETCH
    top_n: int = DEFAULT_TOP_N
    keep_days: int = DEFAULT_KEEP_DAYS
    fetch_concurrency: int = DEFAULT_FETCH_CONCURRENCY
    dry_run: bool = False
    push: bool = True
    write: bool = True

    @classmethod
    def from_env(cls) -> "RunConfig":
        missing = [
            name
            for name in ("SITE_PASSWORD", "TAVILY_API_KEY", "LLM_API_KEY")
            if not (os.environ.get(name) or "").strip()
        ]
        if missing:
            raise ConfigError("缺少环境变量: " + ", ".join(missing))

        return cls(
            password=os.environ["SITE_PASSWORD"],
            tavily_key=os.environ["TAVILY_API_KEY"].strip(),
            llm_key=os.environ["LLM_API_KEY"].strip(),
            webhook_url=(os.environ.get("WECHAT_WEBHOOK_URL") or "").strip(),
            llm_base_url=(os.environ.get("LLM_BASE_URL") or DEFAULT_LLM_BASE_URL).strip(),
            llm_model=(os.environ.get("LLM_MODEL") or DEFAULT_LLM_MODEL).strip(),
            site_url=(os.environ.get("SITE_URL") or "").strip().rstrip("/"),
            max_candidates=_env_int("MAX_CANDIDATES", DEFAULT_MAX_CANDIDATES),
            max_fetch=_env_int("MAX_FETCH", DEFAULT_MAX_FETCH),
            top_n=_env_int("TOP_N", DEFAULT_TOP_N),
            keep_days=_env_int("KEEP_DAYS", DEFAULT_KEEP_DAYS),
            fetch_concurrency=_env_int("FETCH_CONCURRENCY", DEFAULT_FETCH_CONCURRENCY),
        )
