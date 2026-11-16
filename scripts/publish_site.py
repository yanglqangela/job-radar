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
import stat
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
BUILD = ROOT / ".pages-build"
BRANCH = "gh-pages"
NPM = "npm.cmd" if os.name == "nt" else "npm"


def run(cmd: list[str], cwd: Path, env: dict | None = None) -> None:
    print("$", " ".join(cmd))
    subprocess.run(cmd, cwd=cwd, check=True, env=env)


def rmtree_force(path: Path) -> None:
    """Windows 上 git 对象可能是只读的，删除前先去掉只读位。"""
    if not path.exists():
        return

    def onerror(func, target, _exc_info):
        os.chmod(target, stat.S_IWRITE)
        func(target)

    shutil.rmtree(path, onerror=onerror)


def origin_url() -> str:
    result = subprocess.run(
        ["git", "remote", "get-url", "origin"], cwd=ROOT, capture_output=True, text=True, check=True
    )
    return result.stdout.strip()


def main() -> int:
    if not (WEB / "node_modules").exists():
        print("请先在 web/ 目录执行 npm install")
        return 2

    if not (WEB / "public" / "data" / "portfolio.json").exists():
        print("警告：缺少 web/public/data/portfolio.json，作品集首页会显示空状态。")
        print("      请先运行 python scripts/build_portfolio.py")

    print("==> 构建站点（相对 base）")
    run([NPM, "run", "build"], WEB, env={**os.environ, "VITE_BASE": "./"})

    remote = origin_url()

    # 每次从远端 gh-pages 重新克隆，避免在孤儿分支上提交导致 non-fast-forward
    if BUILD.exists():
        rmtree_force(BUILD)
    cloned = subprocess.run(
        [
            "git",
            "clone",
            "--depth",
            "1",
            "--branch",
            BRANCH,
            "--single-branch",
            remote,
            str(BUILD),
        ],
        capture_output=True,
        text=True,
    )
    if cloned.returncode != 0:
        BUILD.mkdir(parents=True, exist_ok=True)
        run(["git", "init", "-b", BRANCH], BUILD)
        run(["git", "remote", "add", "origin", remote], BUILD)

    # 只保留 .git，其余用最新构建产物替换
    for child in BUILD.iterdir():
        if child.name == ".git":
            continue
        if child.is_dir():
            rmtree_force(child)
        else:
            child.unlink()
    shutil.copytree(WEB / "dist", BUILD, dirs_exist_ok=True)

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

    run(["git", "push", "origin", f"HEAD:{BRANCH}"], BUILD)

    print("已推送 gh-pages。Pages 会在约 1 分钟内重新构建。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
