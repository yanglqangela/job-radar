"""加密信封单元测试（Python side）"""

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from crypto import (  # noqa: E402
    CryptoError,
    WrongPassword,
    decrypt_json,
    encrypt_json,
    read_encrypted,
    write_encrypted,
)

FIXTURES = Path(__file__).parent / "fixtures"


def test_roundtrip_unicode():
    payload = {"中文": "你好 🌏", "n": 1, "nested": {"a": [1, 2]}}
    env = encrypt_json(payload, "p@ss-中文-é", iterations=100_000)
    assert decrypt_json(env, "p@ss-中文-é") == payload


def test_roundtrip_kdf_reuse():
    env1 = encrypt_json({"a": 1}, "pw-test", iterations=100_000)
    env2 = encrypt_json({"b": 2}, "pw-test", kdf=env1["kdf"])
    assert env1["kdf"]["salt"] == env2["kdf"]["salt"]
    assert env1["cipher"]["iv"] != env2["cipher"]["iv"]
    assert decrypt_json(env2, "pw-test") == {"b": 2}


def test_wrong_password():
    env = encrypt_json({"a": 1}, "correct", iterations=100_000)
    with pytest.raises(WrongPassword):
        decrypt_json(env, "wrong")


def test_nfkc_password_normalization():
    # 全角字符与半角在 NFKC 下等价
    env = encrypt_json({"a": 1}, "ｐａｓｓ", iterations=100_000)
    assert decrypt_json(env, "pass") == {"a": 1}


def test_reject_bad_envelope():
    with pytest.raises(CryptoError):
        decrypt_json({"v": 2}, "pw")
    env = encrypt_json({}, "pw", iterations=100_000)
    env["kdf"]["iterations"] = 10_000_000
    with pytest.raises(CryptoError):
        decrypt_json(env, "pw")


def test_python_vector_decrypts_in_python():
    fx = json.loads((FIXTURES / "crypto_vector.json").read_text(encoding="utf-8"))
    assert decrypt_json(fx["envelope"], fx["password"]) == fx["plaintext"]


def test_node_vector_decrypts_in_python():
    """由 tests/test_crypto_webcrypto.mjs 生成；不存在时跳过（CI 先跑 node 测试）"""
    path = FIXTURES / "crypto_vector_node.json"
    if not path.exists():
        pytest.skip("node fixture 尚未生成")
    fx = json.loads(path.read_text(encoding="utf-8"))
    assert decrypt_json(fx["envelope"], fx["password"]) == fx["plaintext"]


def test_file_write_read(tmp_path: Path):
    path = tmp_path / "x.enc.json"
    write_encrypted(path, {"hello": "世界"}, "pw-test-file", kdf=None)
    payload, kdf = read_encrypted(path, "pw-test-file")
    assert payload == {"hello": "世界"}
    assert kdf["iterations"] == 600_000
