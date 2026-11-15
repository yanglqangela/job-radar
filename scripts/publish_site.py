#!/usr/bin/env python3
"""
不依赖 GitHub Actions 的站点发布（推到 gh-pages 分支）。

用途：当 Actions 因账户账单/额度问题不可用时，用它把最新数据发布到 Pages。
正常情况优先使用 .github/workflows/deploy.yml。

用法：
    python scripts/publish_site.py

前置：
    - 本机已安装 Node 与 npm；
    - 当前仓库的 origin 指向目标 GitHub 仓库；
    - 已完成 export_from_lq_agent.py（web/public/data/ 下有加密数据）。

说明：
    - 构建产物写到仓库内 .pages-build/（已 gitignore），与主分支代码隔离；
    - 仓库 Settings → Pages 需要选择 gh-pages 分支（本脚本不会改 Pages 配置）。
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
BUILD = ROOT / ".pages-build"
BRANCH = "gh-pages"


def run(cmd: list[str], cwd: Path, env: dict | None = None) -> None:
    print("$", " ".join(cmd))
    subprocess.run(cmd, cwd=cwd, check=True, env=env)


def origin_url() -> str:
    result = subprocess.run(
        ["git", "remote", "get-url", "origin"], cwd=ROOT, capture_output=True, text=True, check=True
    )
    return result.stdout.strip()


def main() -> int:
    if not (WEB / "node_modules").exists():
        print("请先在 web/ 目录执行 npm install")
        return 2

    print("==> 构建站点（相对 base）")
    run(["npm", "run", "build"], WEB, env={**os.environ, "VITE_BASE": "./"})

    if BUILD.exists():
        shutil.rmtree(BUILD)
    shutil.copytree(WEB / "dist", BUILD)

    remote = origin_url()
    if not (BUILD / ".git").exists():
        run(["git", "init", "-b", BRANCH], BUILD)
        run(["git", "remote", "add", "origin", remote], BUILD)
    else:
        run(["git", "remote", "set-url", "origin", remote], BUILD)

    run(["git", "add", "-A"], BUILD)
    status = subprocess.run(["git", "status", "--porcelain"], cwd=BUILD, capture_output=True, text=True)
    if status.stdout.strip():
        message = os.environ.get("PAGES_COMMIT_MESSAGE", "deploy: update site")
        run(
            [
                "git",
                "-c",
                "user.name=job-radar",
                "-c",
                "user.email=job-radar@users.noreply.github.com",
                "commit",
                "-m",
                message,
            ],
            BUILD,
        )
    else:
        print("没有变更，跳过提交")

    # 远程分支存在时先 rebase，避免多台机器发布时冲突；首次发布会失败，忽略即可
    subprocess.run(["git", "pull", "--rebase", "origin", BRANCH], cwd=BUILD)
    run(["git", "push", "origin", BRANCH], BUILD)

    print("已推送 gh-pages。Pages 会在约 1 分钟内重新构建。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
