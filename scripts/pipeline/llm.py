"""OpenAI 兼容 LLM 客户端（只依赖 environment 里的 API Key，不读数据库）"""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)


class LlmError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def parse_json_content(content: str) -> Any:
    """
    清洗并解析 LLM 返回的 JSON：
    1) 去掉 markdown 代码块
    2) 直接解析
    3) 截取首个 { 到最后一个 }
    4) max_tokens 截断时丢弃最后一个逗号后的残缺片段并补齐右括号（移植自 lq-agent）
    """
    text = (content or "").strip()
    if text.startswith("```"):
        first_newline = text.find("\n")
        if first_newline != -1:
            text = text[first_newline + 1 :]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            pass

    if start != -1:
        fragment = text[start:]
        last_comma = fragment.rfind(",")
        if last_comma > 0:
            fragment = fragment[:last_comma]
        open_brackets = fragment.count("[") - fragment.count("]")
        open_braces = fragment.count("{") - fragment.count("}")
        salvaged = fragment + "]" * max(0, open_brackets) + "}" * max(0, open_braces)
        try:
            data = json.loads(salvaged)
            logger.warning("LLM JSON 疑似被截断，已按前缀解析挽救")
            return data
        except json.JSONDecodeError:
            pass

    raise ValueError("无法从 LLM 返回内容中解析出 JSON")


class LlmClient:
    def __init__(
        self,
        base_url: str,
        api_key: str,
        model: str,
        timeout: float = 120.0,
    ):
        self.base_url = (base_url or "").rstrip("/")
        self.url = f"{self.base_url}/chat/completions"
        self.api_key = api_key
        self.model = model
        self.timeout = timeout

    def _request(self, payload: dict) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(self.url, headers=headers, json=payload)
        except httpx.RequestError as exc:
            raise LlmError(0, f"网络错误: {type(exc).__name__}") from exc

        if resp.status_code >= 400:
            message = ""
            try:
                body = resp.json()
                message = str((body.get("error") or {}).get("message") or body)[:300]
            except Exception:  # noqa: BLE001
                message = resp.text[:300]
            raise LlmError(resp.status_code, message or f"HTTP {resp.status_code}")

        try:
            data = resp.json()
            return data["choices"][0]["message"].get("content") or ""
        except Exception as exc:  # noqa: BLE001
            raise LlmError(0, "LLM 响应格式异常") from exc

    def chat_json(
        self,
        system: str,
        user: str,
        max_tokens: Optional[int] = None,
    ) -> Any:
        """要求模型返回 JSON；失败重试一次（第二次放开 max_tokens / json mode）"""
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
        last_error: Exception | None = None
        for attempt in range(2):
            payload: dict[str, Any] = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.1,
                "response_format": {"type": "json_object"},
            }
            if max_tokens and attempt == 0:
                payload["max_tokens"] = max_tokens
            try:
                return parse_json_content(self._request(payload))
            except LlmError as exc:
                last_error = exc
                # 鉴权/余额/权限问题重试无意义
                if exc.status in (401, 402, 403):
                    raise
                logger.warning("LLM 调用失败（第 %d 次）: HTTP %s", attempt + 1, exc.status)
            except ValueError as exc:
                last_error = exc
                logger.warning("LLM JSON 解析失败（第 %d 次）", attempt + 1)
            if attempt == 0:
                time.sleep(1)
        raise LlmError(0, f"LLM 调用失败: {last_error}")
