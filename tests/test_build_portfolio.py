import json
from pathlib import Path

import pytest

from build_portfolio import (
    build_portfolio,
    projection_diff,
    redact,
    write_json_atomic,
)

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIR = ROOT / "web" / "public"


def make_content(**overrides):
    content = {
        "schemaVersion": 1,
        "updatedAt": "2026-01-01",
        "identity": {"name": "测试用户", "headline": "工程师"},
        "contact": {"email": "me@example.com", "links": []},
        "hero": {"title": "你好"},
        "timeline": {"items": [], "compactItems": []},
        "projects": [
            {
                "slug": "demo",
                "name": "演示项目",
                "pitch": "一句话说明",
                "links": [],
                "screenshots": [],
            }
        ],
        "skills": {"groups": [{"name": "工程", "items": [{"name": "Python"}]}]},
        "overrides": {},
        "seo": {},
        "workspace": {},
    }
    content.update(overrides)
    return content


def test_content_only_build():
    data, warnings = build_portfolio(make_content(), None, public_dir=PUBLIC_DIR)
    assert data["schemaVersion"] == 1
    assert data["identity"]["name"] == "测试用户"
    assert data["contact"]["email"] == "me@example.com"
    assert [project["slug"] for project in data["projects"]] == ["demo"]
    assert data["skills"]["groups"][0]["items"][0]["name"] == "Python"
    assert warnings == []


def test_pii_is_redacted_in_free_text():
    content = make_content(
        timeline={
            "items": [
                {
                    "kind": "work",
                    "org": "某公司",
                    "role": "工程师",
                    "bullets": ["电话 13812345678", "邮箱 someone@example.com", "QQ 12345678"],
                }
            ]
        }
    )
    content["projects"][0]["highlights"] = ["微信：abc_12345"]
    data, _ = build_portfolio(content, None, public_dir=PUBLIC_DIR)
    text = json.dumps(data, ensure_ascii=False)
    assert "13812345678" not in text
    assert "someone@example.com" not in text
    assert "12345678" not in text
    assert "abc_12345" not in text
    assert "[已隐藏]" in text
    # 显式 contact.email 不受清洗影响
    assert data["contact"]["email"] == "me@example.com"


def test_source_only_keys_never_reach_output():
    content = make_content()
    content["search"] = {"queries": [{"keywords": "秘密", "city": "杭州"}]}
    content["matchProfile"] = {"skills": ["秘密技能"]}
    content["projects"][0]["sourceTitles"] = ["内部项目名"]
    content["overrides"] = {"projects": {}}
    data, _ = build_portfolio(content, None, public_dir=PUBLIC_DIR)
    assert "search" not in data
    assert "matchProfile" not in data
    assert "sourceTitles" not in data["projects"][0]
    assert "overrides" not in data


def test_screenshot_paths_are_validated(tmp_path):
    content = make_content()
    content["projects"][0]["screenshots"] = [
        {"src": "../secret.png", "alt": "坏路径"},
        {"src": "assets/projects/demo/missing.webp", "alt": "不存在"},
    ]
    with pytest.raises(ValueError):
        build_portfolio(content, None, public_dir=tmp_path, strict=True)

    data, warnings = build_portfolio(content, None, public_dir=tmp_path)
    assert data["projects"][0]["screenshots"] == []
    assert any(".." in warning for warning in warnings)
    assert any("不存在" in warning for warning in warnings)

    good = tmp_path / "assets" / "projects" / "demo"
    good.mkdir(parents=True)
    (good / "ok.webp").write_bytes(b"x")
    content["projects"][0]["screenshots"] = [{"src": "assets/projects/demo/ok.webp"}]
    data, warnings = build_portfolio(content, None, public_dir=tmp_path, strict=True)
    assert data["projects"][0]["screenshots"][0]["src"] == "assets/projects/demo/ok.webp"
    assert warnings == []


def test_profile_items_are_merged_and_allowlisted():
    profile = {
        "generatedAt": "2026-01-02T00:00:00+08:00",
        "sections": {
            "work": [
                {
                    "id": "work-1",
                    "title": "某公司",
                    "lines": ["后端工程师 · 2020.01 - 2021.02", "负责服务端开发"],
                    "sources": ["resume"],
                }
            ],
            "education": [
                {
                    "id": "education-1",
                    "title": "某大学",
                    "lines": ["计算机 · 硕士 · 2018.09 - 2021.06"],
                    "sources": ["resume"],
                }
            ],
            "awards": [
                {
                    "id": "awards-1",
                    "title": "一等奖学金",
                    "lines": ["校级 · 2020 · 某大学"],
                    "sources": ["resume"],
                }
            ],
            "certificates": [],
        },
    }
    data, _ = build_portfolio(make_content(), profile, public_dir=PUBLIC_DIR)
    assert data["profileGeneratedAt"] == "2026-01-02T00:00:00+08:00"
    work = data["timeline"]["items"][0]
    assert work["org"] == "某公司"
    assert work["role"] == "后端工程师"
    assert work["period"] == "2020.01 - 2021.02"
    assert work["bullets"] == ["负责服务端开发"]
    assert data["timeline"]["items"][1]["org"] == "某大学"
    assert data["timeline"]["compactItems"][0]["title"] == "一等奖学金"
    assert "sources" not in json.dumps(data)


def test_override_can_hide_profile_item():
    profile = {
        "sections": {
            "work": [{"title": "某公司", "lines": ["工程师 · 2020.01 - 2021.02"]}],
            "education": [],
            "awards": [],
            "certificates": [],
        }
    }
    content = make_content(overrides={"work": {"某公司": {"hidden": True}}})
    data, _ = build_portfolio(content, profile, public_dir=PUBLIC_DIR)
    assert data["timeline"]["items"] == []


def test_atomic_write_leaves_no_tmp(tmp_path):
    out = tmp_path / "data" / "portfolio.json"
    write_json_atomic(out, {"ok": True})
    assert json.loads(out.read_text(encoding="utf-8")) == {"ok": True}
    assert not (out.with_name("portfolio.json.tmp")).exists()


def test_projection_diff_detects_stale_output():
    built, _ = build_portfolio(make_content(), None, public_dir=PUBLIC_DIR)
    existing = json.loads(json.dumps(built))
    assert projection_diff(built, existing) == []
    existing["identity"]["name"] = "旧名字"
    existing["projects"][0]["pitch"] = "旧文案"
    assert projection_diff(built, existing) == ["identity", "projects"]


def test_real_content_builds():
    content = json.loads((ROOT / "content" / "portfolio.json").read_text(encoding="utf-8"))
    data, warnings = build_portfolio(content, None, public_dir=PUBLIC_DIR)
    assert len(data["projects"]) == 5
    assert {project["slug"] for project in data["projects"]} == {
        "lq-agent",
        "kb-agent",
        "job-radar",
        "dosh-global",
        "cpi",
    }
    assert data["timeline"]["items"]
    # 邮箱为空只应产生一条提示
    assert any("contact.email" in warning for warning in warnings)


def test_redact_keeps_normal_text():
    assert redact("2026.05 — 2026.07") == "2026.05 — 2026.07"
    assert redact(" Java 21 / Spring Boot ") == "Java 21 / Spring Boot"
