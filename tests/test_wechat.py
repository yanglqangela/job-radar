from pipeline.wechat import BUDGET_BYTES, render_markdown, utf8_len


def _job(i: int, score: int) -> dict:
    return {
        "title": f"AI 应用开发工程师 {i}",
        "company": f"测试公司{i}",
        "location": "杭州",
        "url": f"https://example.com/jobs/{i}?from=radar",
        "applyUrl": f"https://example.com/apply/{i}?from=radar",
        "match": {
            "score": score,
            "summary": "技能与项目经历高度匹配，建议优先投递。" * 3,
            "matchedSkills": ["Python", "FastAPI", "PostgreSQL"],
            "missingSkills": ["Kubernetes"],
        },
    }


def test_markdown_within_byte_budget():
    jobs = [_job(i, 90 - i) for i in range(10)]
    content = render_markdown(jobs, "2026-11-15", "https://u.github.io/job-radar/#/today")
    assert utf8_len(content) <= BUDGET_BYTES
    assert "2026" not in content  # 只显示月-日
    assert "11-15" in content


def test_markdown_keeps_urls_intact():
    jobs = [_job(1, 88)]
    content = render_markdown(jobs, "2026-11-15", "https://u.github.io/job-radar/")
    assert "https://example.com/apply/1?from=radar" in content
    assert "[测试公司1]" in content


def test_empty_jobs_still_renders():
    content = render_markdown([], "2026-11-15", "")
    assert "今日职位推荐" in content
    assert "精选 0 条" in content
