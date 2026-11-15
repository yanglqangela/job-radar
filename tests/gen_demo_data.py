#!/usr/bin/env python3
"""
生成本地演示数据（假数据，仅用于开发预览 UI）。

用法：
    DEMO_PASSWORD=demo1234 python tests/gen_demo_data.py
    cd web && npm run dev   # 用 demo1234 解锁

注意：生成的文件会覆盖 web/public/data/ 下的真实数据，正式部署前请重新运行
scripts/export_from_lq_agent.py。
"""

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from crypto import write_encrypted  # noqa: E402

DATA_DIR = ROOT / "web" / "public" / "data"
PASSWORD = os.environ.get("DEMO_PASSWORD", "")
if not PASSWORD:
    sys.exit("请设置 DEMO_PASSWORD，例如 DEMO_PASSWORD=demo1234")

PROFILE = {
    "schemaVersion": 1,
    "generatedAt": "2026-11-15T09:00:00+08:00",
    "search": {
        "queries": [{"keywords": "AI应用开发", "city": "杭州"}],
        "excludeCompanies": [],
        "topN": 5,
    },
    "meta": {"name": "演示用户", "yearsOfExperience": "5 年", "summary": "专注 AI 应用与 RAG 工程。"},
    "sections": {
        "projects": [
            {
                "id": "projects-1",
                "kind": "projects",
                "title": "企业知识库问答平台",
                "sources": ["kb", "resume"],
                "lines": [
                    "基于 RAG 的企业知识库问答，支持多格式文档解析与引用回溯",
                    "技术栈：Python、FastAPI、PostgreSQL、DeepSeek",
                    "首字延迟从 3.2s 降到 0.9s，问答准确率提升 28%",
                ],
                "text": "基于 RAG 的企业知识库问答\n技术栈：Python、FastAPI、PostgreSQL、DeepSeek\n首字延迟 0.9s",
            }
        ],
        "work": [
            {
                "id": "work-1",
                "kind": "work",
                "title": "演示科技",
                "sources": ["resume"],
                "lines": ["AI 应用开发 · 2021-03 ~ 2025-06", "负责 LLM 应用落地与工程化。"],
                "text": "演示科技 AI 应用开发",
            }
        ],
        "education": [
            {
                "id": "education-1",
                "kind": "education",
                "title": "演示大学",
                "sources": ["resume"],
                "lines": ["计算机科学 · 本科 · 2015-09 ~ 2019-06"],
                "text": "演示大学 计算机科学 本科",
            }
        ],
        "awards": [],
        "certificates": [],
        "publications": [],
        "portfolio": [],
    },
    "matchProfile": {
        "skills": ["Python", "FastAPI", "PostgreSQL", "RAG", "LangChain", "Docker"],
        "targetTitles": ["AI应用开发"],
        "summary": "5 年 AI 应用开发经验，擅长 RAG、Agent 与工程化落地。",
    },
}


def job(i, score, **overrides):
    base = {
        "id": f"j_demo{i:08d}",
        "date": "2026-11-15" if i <= 3 else "2026-11-14",
        "firstSeenAt": "2026-11-15T01:30:00Z",
        "title": f"AI 应用开发工程师 {i}",
        "company": f"演示公司 {i}",
        "location": "杭州" if i % 2 else "上海",
        "salary": "25-40K",
        "category": "开发",
        "url": f"https://example.com/jobs/{i}",
        "applyUrl": f"https://example.com/apply/{i}",
        "source": "official" if i % 2 else "platform",
        "summary": "负责 LLM 应用、RAG 检索与 Agent 工作流建设。",
        "skills": ["Python", "FastAPI", "RAG", "Kubernetes"],
        "responsibilities": ["设计与实现 RAG 检索链路", "优化推理成本与延迟"],
        "requirements": ["3 年以上后端经验", "熟悉向量检索"],
        "match": {
            "score": score,
            "summary": "技能与项目经历高度匹配，建议优先投递。",
            "matchedSkills": ["Python", "FastAPI", "RAG"],
            "missingSkills": ["Kubernetes"],
            "advantages": ["有完整的 RAG 落地经验"],
            "gaps": ["缺少大规模集群运维经验"],
            "suggestions": ["准备一个检索效果评估的案例"],
            "source": "llm",
        },
        "pushed": True,
    }
    base.update(overrides)
    return base


DIGEST = {
    "schemaVersion": 1,
    "generatedAt": "2026-11-15T01:30:00Z",
    "runDate": "2026-11-15",
    "run": {
        "status": "ok",
        "counts": {"searched": 38, "newCandidates": 11, "fetched": 8, "matched": 6, "pushed": 5},
        "degradedReasons": [],
    },
    "jobs": [job(i, 90 - i * 4) for i in range(1, 7)],
    "seen": {},
}

META = {
    "schemaVersion": 1,
    "lastRunAt": "2026-11-15T01:30:00Z",
    "runDate": "2026-11-15",
    "status": "ok",
    "newJobs": 6,
    "totalJobs": 6,
    "degradedReasons": [],
}


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    write_encrypted(DATA_DIR / "profile.enc.json", PROFILE, PASSWORD)
    # 复用 profile 的 salt，浏览器只派生一次密钥
    from crypto import read_encrypted

    _, kdf = read_encrypted(DATA_DIR / "profile.enc.json", PASSWORD)
    write_encrypted(DATA_DIR / "digest.enc.json", DIGEST, PASSWORD, kdf=kdf)
    (DATA_DIR / "meta.json").write_text(
        json.dumps(META, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"已生成演示数据 -> {DATA_DIR}（密码：{PASSWORD}）")
    print("提醒：正式部署前请重新运行 scripts/export_from_lq_agent.py")


if __name__ == "__main__":
    main()
