#!/usr/bin/env python3
"""
轮换站点密码：用旧密码解密 profile/digest，再用新密码（新 salt）重加密。

用法（Linux/macOS）：
    SITE_PASSWORD_OLD=旧密码 SITE_PASSWORD_NEW=新密码 python scripts/rotate_password.py
Windows PowerShell：
    $env:SITE_PASSWORD_OLD="旧密码"; $env:SITE_PASSWORD_NEW="新密码"; python scripts/rotate_password.py

完成后记得更新 GitHub Secret SITE_PASSWORD。
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from crypto import CryptoError, read_encrypted, write_encrypted  # noqa: E402

DATA_DIR = ROOT / "web" / "public" / "data"
PROFILE_PATH = DATA_DIR / "profile.enc.json"
DIGEST_PATH = DATA_DIR / "digest.enc.json"


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="轮换加密密码")
    parser.add_argument("--old-env", default="SITE_PASSWORD_OLD")
    parser.add_argument("--new-env", default="SITE_PASSWORD_NEW")
    args = parser.parse_args(argv)

    old = os.environ.get(args.old_env, "")
    new = os.environ.get(args.new_env, "")
    if not old.strip() or not new.strip():
        print(f"请设置 {args.old_env} 与 {args.new_env}")
        return 2
    if old == new:
        print("新旧密码相同，无需轮换")
        return 2
    if not PROFILE_PATH.exists():
        print(f"缺少 {PROFILE_PATH}")
        return 2

    try:
        profile, _ = read_encrypted(PROFILE_PATH, old)
    except CryptoError as exc:
        print(f"旧密码无法解密 profile：{exc}")
        return 2

    digest = None
    if DIGEST_PATH.exists():
        try:
            digest, _ = read_encrypted(DIGEST_PATH, old)
        except CryptoError as exc:
            print(f"旧密码无法解密 digest：{exc}")
            return 2

    # 先写临时文件并验证，再原子替换
    write_encrypted(PROFILE_PATH, profile, new)
    _, new_kdf = read_encrypted(PROFILE_PATH, new)
    verify, _ = read_encrypted(PROFILE_PATH, new)
    if verify != profile:
        print("校验失败：已中止，旧文件未被修改（请检查磁盘）")
        return 1

    if digest is not None:
        write_encrypted(DIGEST_PATH, digest, new, kdf=new_kdf)
        verify_digest, _ = read_encrypted(DIGEST_PATH, new)
        if verify_digest != digest:
            print("digest 校验失败：请手动检查")
            return 1

    print("密码轮换完成；请同步更新 GitHub Secret SITE_PASSWORD")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
