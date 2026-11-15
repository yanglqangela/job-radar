#!/usr/bin/env python3
"""
生成跨语言加密测试向量（Python side）。

用法：python tests/gen_crypto_fixtures.py
输出：tests/fixtures/crypto_vector.json

迭代次数固定为 100000 只是为了让测试跑得快；生产使用 600000。
兼容性只取决于算法与参数，与迭代次数无关。
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from crypto import encrypt_json  # noqa: E402

PASSWORD = "test-password-中文-é"
PLAINTEXT = {
    "msg": "你好，世界 🌏",
    "n": 42,
    "nested": {"项目": "RAG 问答", "skills": ["Python", "FastAPI", "PostgreSQL"]},
    "array": [1, 2, 3, "四"],
}


def main() -> None:
    envelope = encrypt_json(PLAINTEXT, PASSWORD, iterations=100_000)
    out = {
        "password": PASSWORD,
        "iterations": 100_000,
        "plaintext": PLAINTEXT,
        "envelope": envelope,
    }
    path = ROOT / "tests" / "fixtures" / "crypto_vector.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"已生成 {path}")


if __name__ == "__main__":
    main()
