"""
/app/content/articles: drafts, publishing (now / scheduled), taking down, revisions, slugs, the HTML the
editor writes (sanitised) and copying a remote image to our storage.
"""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.rbac import Role
from apps.cms.models import Article, ArticleRevision
from apps.core import uploads
from tests.conftest import make_staff

pytestmark = pytest.mark.django_db
URL = "/api/v1/staff/articles/"


def _writer():
    """articles.create_edit without articles.publish."""
    user = make_staff(Role.CONTENT_SEO)
    user.permission_overrides = {"revoked": ["articles.publish"]}
    user.save(update_fields=["permission_overrides"])
    client = APIClient()
    client.force_authenticate(user)
    return client


def test_a_writer_drafts_an_editor_publishes(staff_client):
    writer = _writer()
    res = writer.post(
        URL, {"title": "Đào tạo Ngân hàng", "slug": "Đào tạo Ngân hàng!", "status": "draft"}, format="json"
    )
    assert res.status_code == 201, res.content
    article = Article.objects.get()
    assert article.slug == "dao-tao-ngan-hang" and article.status == "draft" and not article.is_public
    assert writer.get("/api/v1/public/articles/dao-tao-ngan-hang/").status_code == 404

    assert writer.patch(f"{URL}{article.pk}/", {"status": "published"}, format="json").status_code == 403
    assert (
        writer.post(URL, {"title": "B", "slug": "b", "status": "published"}, format="json").status_code == 403
    )

    editor = staff_client(Role.CONTENT_SEO)
    assert editor.patch(f"{URL}{article.pk}/", {"status": "published"}, format="json").status_code == 200
    article.refresh_from_db()
    assert (
        article.published_at
        and APIClient().get("/api/v1/public/articles/dao-tao-ngan-hang/").status_code == 200
    )
    # Taking it down is publishing too.
    assert writer.patch(f"{URL}{article.pk}/", {"status": "draft"}, format="json").status_code == 403
    assert editor.patch(f"{URL}{article.pk}/", {"status": "draft"}, format="json").status_code == 200


def test_scheduled_and_slug_rules(staff_client):
    editor = staff_client(Role.CONTENT_SEO)
    assert (
        editor.post(URL, {"title": "A", "slug": "a", "status": "scheduled"}, format="json").status_code == 400
    )
    later = (timezone.now() + timedelta(days=1)).isoformat()
    res = editor.post(
        URL, {"title": "A", "slug": "a", "status": "scheduled", "publishedAt": later}, format="json"
    )
    assert res.status_code == 201 and not Article.objects.get(slug="a").is_public
    dup = editor.post(URL, {"title": "A2", "slug": "A", "status": "draft"}, format="json")
    assert dup.status_code == 400 and "slug" in dup.json()
    # The list leaves the body out.
    row = editor.get(URL).json()["results"][0]
    assert "content" not in row and "isPublic" in row


def test_editor_html_is_kept_scripts_and_styles_dropped(staff_client):
    editor = staff_client(Role.CONTENT_SEO)
    html = (
        '<h2 style="text-align: center">T</h2><p><span style="color: #e11d48; position: fixed">x</span>'
        '<mark style="background-color: #fef08a">y</mark><s>z</s></p><img src="https://cdn.example/a.png" '
        'onerror="alert(1)"><script>alert(1)</script><table><colgroup><col></colgroup><tbody><tr>'
        '<td colwidth="120">c</td></tr></tbody></table>'
    )
    res = editor.post(URL, {"title": "H", "slug": "h", "content": html}, format="json")
    content = Article.objects.get(pk=res.json()["id"]).content
    assert 'style="text-align:center"' in content.replace(": ", ":")
    assert "color:#e11d48" in content.replace(": ", ":") and "position" not in content
    assert "<mark" in content and "<s>" in content and "<colgroup>" in content
    assert "script" not in content and "onerror" not in content


def test_revisions_one_per_editing_session(staff_client):
    editor = staff_client(Role.CONTENT_SEO)
    article = Article.objects.create(title="V1", slug="v", content="<p>một</p>")
    editor.patch(f"{URL}{article.pk}/", {"content": "<p>hai</p>"}, format="json")
    editor.patch(f"{URL}{article.pk}/", {"content": "<p>ba</p>"}, format="json")  # autosave: same session
    revisions = editor.get(f"{URL}{article.pk}/revisions/").json()
    assert len(revisions) == 1 and revisions[0]["content"] == "<p>một</p>"
    ArticleRevision.objects.update(created_at=timezone.now() - timedelta(hours=1))
    editor.patch(f"{URL}{article.pk}/", {"title": "V1"}, format="json")  # nothing changed: none
    editor.patch(f"{URL}{article.pk}/", {"content": "<p>bốn</p>"}, format="json")
    assert ArticleRevision.objects.count() == 2


def test_remote_image_is_copied_to_our_storage(staff_client, monkeypatch):
    editor = staff_client(Role.CONTENT_SEO)
    url = "/api/v1/staff/uploads/images/import/"
    # Private / internal addresses are refused before any request.
    for bad in (
        "http://127.0.0.1/a.png",
        "http://backend:8000/x.png",
        "file:///etc/passwd",
        "http://10.0.0.5/a.png",
    ):
        res = editor.post(url, {"url": bad}, format="json")
        assert res.status_code == 400, bad

    import io

    from PIL import Image

    png = io.BytesIO()
    Image.new("RGB", (4, 4), "red").save(png, format="PNG")
    monkeypatch.setattr(uploads, "_public_host", lambda host: True)
    monkeypatch.setattr(uploads, "fetch_remote_image", lambda u: io.BytesIO(png.getvalue()))
    res = editor.post(url, {"url": "https://images.example.com/a.png"}, format="json")
    assert res.status_code == 201 and res.json()["url"].endswith(".png")
    assert (
        staff_client(Role.FINANCE_ACCOUNTANT)
        .post(url, {"url": "https://x.example/a.png"}, format="json")
        .status_code
        == 403
    )
