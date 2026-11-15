#!/usr/bin/env python3
"""
加密信封工具：PBKDF2-HMAC-SHA256(600k) -> AES-256-GCM

与 web/src/lib/crypto.ts 必须逐字节兼容：
- 密钥：PBKDF2(password 经 NFKC 归一化, salt, iterations) 派生 32 字节
- 密文：AES-GCM，cryptography 返回的 bytes 尾部自带 16 字节 tag，
  与 Web Crypto decrypt 的 `data` 参数格式一致
- base64：标准编码（带 padding），不是 URL-safe

CLI（仅用于本地调试）：
    python scripts/crypto.py gen-password
    python scripts/crypto.py encrypt --in plain.json --out data.enc.json --password-env SITE_PASSWORD
    python scripts/crypto.py decrypt --in data.enc.json --password-env SITE_PASSWORD
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import secrets
import sys
import unicodedata
from pathlib import Path
from typing import Any, Optional, Tuple

try:
    from cryptography.exceptions import InvalidTag
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
except ImportError:  # pragma: no cover
    sys.exit("缺少 cryptography 依赖：pip install -r requirements.txt")

KDF_ALG = "PBKDF2-HMAC-SHA256"
CIPHER_ALG = "AES-256-GCM"
DEFAULT_ITERATIONS = 600_000
MIN_ITERATIONS = 100_000
MAX_ITERATIONS = 2_000_000
SALT_BYTES = 16
IV_BYTES = 12


class CryptoError(Exception):
    """信封格式错误"""


class WrongPassword(CryptoError):
    """密码错误或密文损坏"""


def normalize_password(password: str) -> str:
    return unicodedata.normalize("NFKC", password)


def derive_key(password: str, salt: bytes, iterations: int) -> bytes:
    if not MIN_ITERATIONS <= iterations <= MAX_ITERATIONS:
        raise CryptoError("密钥派生迭代次数超出允许范围")
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=iterations,
    )
    return kdf.derive(normalize_password(password).encode("utf-8"))


def canonical_json(obj: Any) -> bytes:
    """与签名/解密无关，但固定序列化方式便于复现和调试"""
    return json.dumps(
        obj, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def validate_envelope(envelope: dict) -> None:
    if not isinstance(envelope, dict) or envelope.get("v") != 1:
        raise CryptoError("不支持的数据格式")
    kdf = envelope.get("kdf") or {}
    cipher = envelope.get("cipher") or {}
    if kdf.get("alg") != KDF_ALG:
        raise CryptoError("不支持的密钥派生算法")
    if cipher.get("alg") != CIPHER_ALG:
        raise CryptoError("不支持的加密算法")
    iterations = kdf.get("iterations")
    if not isinstance(iterations, int) or not MIN_ITERATIONS <= iterations <= MAX_ITERATIONS:
        raise CryptoError("密钥派生参数异常")
    for key in ("salt", "iv", "data"):
        value = kdf.get("salt") if key == "salt" else cipher.get("iv") if key == "iv" else envelope.get("data")
        if not isinstance(value, str) or not value:
            raise CryptoError("数据不完整")


def encrypt_json(
    obj: Any,
    password: str,
    kdf: Optional[dict] = None,
    iterations: int = DEFAULT_ITERATIONS,
) -> dict:
    """加密为信封；传入 kdf 时复用其 salt/iterations（多文件共用同一派生密钥）"""
    if kdf:
        validate_envelope(
            {"v": 1, "kdf": kdf, "cipher": {"alg": CIPHER_ALG, "iv": "x"}, "data": "x"}
        )
        salt = base64.b64decode(kdf["salt"])
        iterations = int(kdf["iterations"])
    else:
        salt = os.urandom(SALT_BYTES)
    key = derive_key(password, salt, iterations)
    iv = os.urandom(IV_BYTES)
    ciphertext = AESGCM(key).encrypt(iv, canonical_json(obj), None)
    return {
        "v": 1,
        "kdf": {
            "alg": KDF_ALG,
            "iterations": iterations,
            "salt": base64.b64encode(salt).decode("ascii"),
        },
        "cipher": {
            "alg": CIPHER_ALG,
            "iv": base64.b64encode(iv).decode("ascii"),
            "tagBits": 128,
        },
        "data": base64.b64encode(ciphertext).decode("ascii"),
    }


def decrypt_json(envelope: dict, password: str) -> Any:
    validate_envelope(envelope)
    kdf = envelope["kdf"]
    salt = base64.b64decode(kdf["salt"])
    iv = base64.b64decode(envelope["cipher"]["iv"])
    data = base64.b64decode(envelope["data"])
    key = derive_key(password, salt, int(kdf["iterations"]))
    try:
        plain = AESGCM(key).decrypt(iv, data, None)
    except InvalidTag as exc:
        raise WrongPassword("密码错误或数据损坏") from exc
    return json.loads(plain.decode("utf-8"))


def read_encrypted(path: Path, password: str) -> Tuple[Any, dict]:
    """返回 (payload, kdf)；kdf 用于同盐加密其它文件"""
    envelope = json.loads(Path(path).read_text(encoding="utf-8"))
    return decrypt_json(envelope, password), envelope.get("kdf", {})


def write_encrypted(
    path: Path,
    obj: Any,
    password: str,
    kdf: Optional[dict] = None,
) -> None:
    """原子写入（临时文件同目录 + os.replace），避免中断留下半截 JSON"""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    envelope = encrypt_json(obj, password, kdf=kdf)
    payload = json.dumps(envelope, ensure_ascii=False, indent=1) + "\n"
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(payload, encoding="utf-8")
    os.replace(tmp, path)


def resolve_password(args: argparse.Namespace) -> str:
    password = getattr(args, "password", None)
    if not password and getattr(args, "password_env", None):
        password = os.environ.get(args.password_env)
        if password is None:
            sys.exit(f"环境变量 {args.password_env} 未设置")
    if not password:
        sys.exit("需要 --password 或 --password-env")
    if not password.strip() or password != password.strip():
        sys.exit("密码不能为空或包含首尾空白")
    return password


def main(argv: Optional[list] = None) -> int:
    parser = argparse.ArgumentParser(description="加密信封工具")
    sub = parser.add_subparsers(dest="command", required=True)

    p_gen = sub.add_parser("gen-password", help="生成强随机密码")

    p_enc = sub.add_parser("encrypt", help="加密 JSON 文件")
    p_enc.add_argument("--in", dest="infile", required=True)
    p_enc.add_argument("--out", dest="outfile", required=True)
    p_enc.add_argument("--password")
    p_enc.add_argument("--password-env", default="SITE_PASSWORD")

    p_dec = sub.add_parser("decrypt", help="解密 JSON 文件（仅打印结构摘要）")
    p_dec.add_argument("--in", dest="infile", required=True)
    p_dec.add_argument("--password")
    p_dec.add_argument("--password-env", default="SITE_PASSWORD")
    p_dec.add_argument("--dump", action="store_true", help="在终端打印明文（谨慎使用）")

    args = parser.parse_args(argv)

    if args.command == "gen-password":
        print(secrets.token_urlsafe(24))
        return 0

    if args.command == "encrypt":
        password = resolve_password(args)
        try:
            obj = json.loads(Path(args.infile).read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            sys.exit(f"输入不是合法 JSON: {exc}")
        write_encrypted(Path(args.outfile), obj, password)
        print(f"已加密 -> {args.outfile}")
        return 0

    if args.command == "decrypt":
        password = resolve_password(args)
        try:
            obj, _ = read_encrypted(Path(args.infile), password)
        except WrongPassword as exc:
            sys.exit(str(exc))
        if args.dump:
            print(json.dumps(obj, ensure_ascii=False, indent=2))
        else:
            keys = sorted(obj.keys()) if isinstance(obj, dict) else []
            print(f"解密成功，顶层字段: {keys}")
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
