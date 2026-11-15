from datetime import date

from pipeline.dedupe import (
    candidate_keys,
    dedupe_batch,
    filter_seen,
    is_seen,
    mark_seen,
    prune_seen,
    url_key,
)


def test_url_key_strips_query_and_fragment():
    assert url_key("https://a.com/jobs/1?x=1#top") == "https://a.com/jobs/1"
    assert url_key("https://a.com/jobs/1/") == "https://a.com/jobs/1"


def test_dedupe_batch_keeps_first_and_http_only():
    raw = [
        {"url": "https://a.com/j/1?x=1", "title": "A"},
        {"url": "https://a.com/j/1", "title": "A2"},
        {"url": "ftp://a.com/x", "title": "bad"},
        {"url": "", "title": "empty"},
        {"url": "https://b.com/j/2", "title": "B"},
    ]
    out = dedupe_batch(raw)
    assert [r["title"] for r in out] == ["A", "B"]


def test_candidate_keys_include_company_title_tokens():
    keys = candidate_keys("某某科技有限公司", "AI 应用开发工程师", "https://a.com/j/1?x=1")
    assert "url:https://a.com/j/1" in keys
    assert any(k.startswith("tc:") and "ai应用开发工程师" in k for k in keys)


def test_seen_filter_and_ttl():
    today = date(2026, 11, 15)
    seen: dict = {}
    mark_seen(seen, "某公司", "AI开发", "https://a.com/j/1", "2026-11-14")
    assert is_seen({"url": "https://a.com/j/1?utm=1", "title": ""}, seen, today)
    # 跨站点同岗位（公司+岗位 token 都命中）也应视为已见
    assert is_seen({"url": "https://b.com/x", "title": "某公司 AI开发", "content": ""}, seen, today)

    candidates = [
        {"url": "https://a.com/j/1", "title": "x"},
        {"url": "https://c.com/new", "title": "y"},
    ]
    fresh = filter_seen(candidates, seen, today)
    assert [c["url"] for c in fresh] == ["https://c.com/new"]

    # stored 60 天过期
    old = dict(seen)
    old["url:https://old.com/x"] = {"d": "2026-01-01", "r": "stored"}
    pruned = prune_seen(old, today)
    assert "url:https://old.com/x" not in pruned


def test_failed_ttl_shorter():
    today = date(2026, 11, 15)
    seen = {"url:https://f.com/x": {"d": "2026-11-01", "r": "failed"}}
    assert prune_seen(seen, today) == {}
