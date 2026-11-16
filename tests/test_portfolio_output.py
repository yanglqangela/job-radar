import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "public" / "data" / "portfolio.json"
PUBLIC_DIR = ROOT / "web" / "public"

ALLOWED_KEYS = {
    "schemaVersion",
    "contentUpdatedAt",
    "profileGeneratedAt",
    "identity",
    "contact",
    "hero",
    "timeline",
    "projects",
    "skills",
    "seo",
    "workspace",
}
PHONE_RE = re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


def load():
    assert OUT.is_file(), "缺少 web/public/data/portfolio.json，先运行 build_portfolio.py"
    return json.loads(OUT.read_text(encoding="utf-8"))


def walk_strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from walk_strings(item)
    elif isinstance(value, dict):
        for item in value.values():
            yield from walk_strings(item)


def test_output_is_allowlisted():
    data = load()
    assert set(data) <= ALLOWED_KEYS
    assert data["schemaVersion"] == 1
    assert data["identity"]["name"]


def test_projects_are_unique_and_have_required_fields():
    data = load()
    slugs = [project["slug"] for project in data["projects"]]
    assert len(slugs) == len(set(slugs))
    assert slugs
    for project in data["projects"]:
        assert re.fullmatch(r"[a-z0-9][a-z0-9-]*", project["slug"])
        assert project["name"] and project["pitch"]
        assert isinstance(project["decisions"], list)
        assert isinstance(project["stack"], list)


def test_links_are_safe():
    data = load()
    links = list((data.get("contact") or {}).get("links") or [])
    for project in data["projects"]:
        links.extend(project.get("links") or [])
    for link in links:
        assert link["label"]
        assert link["url"].startswith(("https://", "http://", "mailto:")), link


def test_screenshots_exist_and_are_relative():
    data = load()
    for project in data["projects"]:
        for shot in project.get("screenshots") or []:
            src = shot["src"]
            assert not src.startswith("/") and "://" not in src and ".." not in src
            assert (PUBLIC_DIR / src).is_file(), src


def test_no_phone_or_extra_email():
    data = load()
    allowed_email = (data.get("contact") or {}).get("email") or ""
    for text in walk_strings(data):
        assert not PHONE_RE.search(text), text
        for email in EMAIL_RE.findall(text):
            assert email == allowed_email, f"未授权的邮箱出现在输出里：{email}"


def test_timeline_items_have_display_fields():
    data = load()
    for item in data["timeline"]["items"]:
        assert item["kind"] in {"work", "education"}
        assert item.get("org")
        assert item.get("role")
