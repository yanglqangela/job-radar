from pipeline.jd import is_empty_jd, normalize_jd
from pipeline.llm import parse_json_content
from pipeline.match import heuristic_match, normalize_match


class _Page:
    title = "页面标题"
    apply_links = [{"url": "https://ats.example.com/apply/1", "text": "立即申请", "source": "anchor"}]


def test_parse_fenced_json():
    assert parse_json_content('```json\n{"a": 1}\n```') == {"a": 1}


def test_parse_json_with_text_around():
    assert parse_json_content('好的，结果如下：{"a": 2} 以上。') == {"a": 2}


def test_parse_truncated_json_salvage():
    raw = '{"score": 80, "summary": "ok", "matched_skills": ["Python", "Fast'
    data = parse_json_content(raw)
    assert data["score"] == 80
    assert data["matched_skills"] == ["Python"]


def test_normalize_jd_uses_apply_link_fallback():
    raw = {
        "title": "AI 开发",
        "company": "某公司",
        "skills": ["Python"],
        "requirements": ["3 年经验"],
        "category": "不存在的分类",
        "application_url": "not-a-url",
    }
    jd = normalize_jd(raw, _Page(), {"url": "https://job.example.com/1"})
    assert jd["category"] == "其他"
    assert jd["application_url"] == "https://ats.example.com/apply/1"
    assert jd["skills"] == ["Python"]


def test_normalize_jd_rejects_empty():
    assert normalize_jd({"title": ""}, _Page(), {"url": "https://x.com/1"}) is None
    assert is_empty_jd({"responsibilities": [], "requirements": [], "preferred": [], "skills": []})


def test_heuristic_match():
    profile = {"matchProfile": {"skills": ["Python", "FastAPI", "SQL"]}}
    jd = {
        "title": "后端开发",
        "skills": ["Python", "FastAPI", "Kubernetes"],
        "requirements": ["熟悉 SQL"],
        "responsibilities": [],
        "summary": "",
    }
    match = heuristic_match(profile, jd)
    assert match["source"] == "heuristic"
    assert 40 <= match["score"] <= 90
    assert "Python" in match["matchedSkills"]
    assert "Kubernetes" in match["missingSkills"]


def test_normalize_match_clamps_and_types():
    match = normalize_match(
        {"score": "120", "summary": "s", "matched_skills": ["a", 1], "gaps": None},
        source="llm",
    )
    assert match["score"] == 100
    assert match["matchedSkills"] == ["a", "1"]
    assert match["gaps"] == []
