import io

import pytest
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from tests.conftest import Role

pytestmark = pytest.mark.django_db
URL = "/api/v1/staff/uploads/images/"


def _image(fmt: str, name: str, size=(32, 32)) -> SimpleUploadedFile:
    buf = io.BytesIO()
    Image.new("RGB", size, (0, 115, 193)).save(buf, format=fmt)
    return SimpleUploadedFile(name, buf.getvalue())


@pytest.mark.parametrize(("fmt", "name", "ext"), [("PNG", "logo.png", "png"), ("ICO", "favicon.ico", "ico")])
def test_seo_editor_uploads_logo_and_favicon(staff_client, fmt, name, ext):
    res = staff_client(Role.CONTENT_SEO).post(URL, {"file": _image(fmt, name)}, format="multipart")
    assert res.status_code == 201, res.content
    path = res.json()["path"]
    assert path.startswith("uploads/") and path.endswith(f".{ext}") and name not in path  # random name
    assert default_storage.exists(path)


def test_non_images_and_svg_are_refused(staff_client):
    client = staff_client(Role.CONTENT_SEO)
    svg = SimpleUploadedFile(
        "x.svg", b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    )
    assert client.post(URL, {"file": svg}, format="multipart").status_code == 400
    fake = SimpleUploadedFile("x.png", b"not an image")
    assert client.post(URL, {"file": fake}, format="multipart").status_code == 400


def test_upload_needs_a_content_permission(staff_client):
    res = staff_client(Role.FINANCE_ACCOUNTANT).post(
        URL, {"file": _image("PNG", "a.png")}, format="multipart"
    )
    assert res.status_code == 403


def test_public_site_config_exposes_only_public_documents(api):
    from apps.core.models import SiteConfig

    SiteConfig.objects.create(key=SiteConfig.KEY_SITE_SEO, data={"faviconUrl": "https://x/f.png"})
    SiteConfig.objects.create(key=SiteConfig.KEY_JOURNEYS, data={"abandoned_checkout": {"enabled": False}})
    assert api.get("/api/v1/public/site-config/site_seo/").status_code == 200
    assert api.get("/api/v1/public/site-config/journeys/").status_code == 404


def test_demo_brand_images_are_cleared(db):
    from importlib import import_module

    from django.apps import apps as django_apps

    from apps.core.models import SiteConfig

    SiteConfig.objects.create(
        key=SiteConfig.KEY_SITE_SEO,
        data={
            "logo_url": "https://images.unsplash.com/x",
            "favicon_url": "https://r2.example/f.png",
            "site_name": "T",
        },
    )
    import_module("apps.core.migrations.0003_clear_demo_brand_images").clear_demo_images(django_apps, None)
    data = SiteConfig.objects.get(key=SiteConfig.KEY_SITE_SEO).data
    assert data == {"logo_url": "", "favicon_url": "https://r2.example/f.png", "site_name": "T"}
