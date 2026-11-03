"""The option lists (danh mục) kept in the database and managed in /app → Hệ thống → Danh mục."""

import pytest

from apps.accounts.rbac import Role
from apps.cms.models import Article
from apps.core.models import AuditLog
from apps.crm.lists import normalize, values
from apps.crm.models import Learner, ListItem, Order

pytestmark = pytest.mark.django_db
URL = "/api/v1/staff/lists/"


def _kind(payload, key):
    return next(k for k in payload["kinds"] if k["key"] == key)


def test_the_lists_are_loaded_and_every_staff_member_reads_them(staff_client):
    assert len(values("province")) == 34 and "Facebook ads" in values("source")
    assert "Ngân Hàng & Tín Dụng" in values("course_category") and len(values("university")) > 500
    for role in (Role.SALES_CRM, Role.CONTENT_SEO):
        lists = staff_client(role).get("/api/v1/staff/crm/lists/").json()
        assert len(lists["provinces"]) == 34 and lists["courseCategories"][0] == "Ngân Hàng & Tín Dụng"
        assert lists["courseLevels"] and len(lists["msbUnits"]) > 200


def test_only_list_managers_change_them(staff_client):
    assert staff_client(Role.SALES_CRM).get(URL).status_code == 403
    assert staff_client(Role.SALES_CRM).post(f"{URL}source/", {"value": "X"}).status_code == 403
    assert staff_client(Role.SUPER_ADMIN).get(URL).status_code == 200


def test_add_hide_order_and_delete(staff_client):
    admin = staff_client(Role.SUPER_ADMIN)
    r = admin.post(f"{URL}source/", {"value": "  LinkedIn  "}, format="json")
    assert r.status_code == 201 and r.json()["items"][-1]["value"] == "LinkedIn"
    assert admin.post(f"{URL}source/", {"value": "LinkedIn"}, format="json").status_code == 400

    item = ListItem.objects.get(kind="source", value="LinkedIn")
    admin.patch(f"{URL}items/{item.id}/", {"active": False}, format="json")
    assert "LinkedIn" not in values("source") and "LinkedIn" in values("source", include_hidden=True)
    assert "LinkedIn" not in admin.get("/api/v1/staff/crm/lists/").json()["sources"]

    admin.post(f"{URL}source/order/", {"ids": [item.id]}, format="json")
    assert values("source", include_hidden=True)[0] == "LinkedIn"

    Order.objects.create(customer_name="A", source="LinkedIn")
    assert admin.delete(f"{URL}items/{item.id}/").status_code == 400  # in use
    Order.objects.filter(source="LinkedIn").delete()
    assert admin.delete(f"{URL}items/{item.id}/").status_code == 200
    assert not ListItem.objects.filter(pk=item.pk).exists()
    assert AuditLog.objects.filter(action="lists.delete").exists()


def test_a_rename_is_carried_onto_the_records_and_can_merge(staff_client):
    admin = staff_client(Role.SUPER_ADMIN)
    Learner.objects.create(full_name="B", area="Huế")
    Article.objects.create(slug="a", title="A", category="Ngân Hàng & Tín Dụng")
    hue = ListItem.objects.get(kind="province", value="Huế")
    r = admin.patch(f"{URL}items/{hue.id}/", {"value": "TP. Huế"}, format="json")
    assert r.json()["records"] == 1 and Learner.objects.get(full_name="B").area == "TP. Huế"
    assert normalize("province", "tp hue") == "TP. Huế"

    bank = ListItem.objects.get(kind="course_category", value="Ngân Hàng & Tín Dụng")
    ai = ListItem.objects.get(kind="course_category", value="Trí tuệ nhân tạo (AI)")
    r = admin.patch(f"{URL}items/{bank.id}/", {"value": ai.value}, format="json")  # merge
    assert r.status_code == 200 and not ListItem.objects.filter(pk=bank.pk).exists()
    assert Article.objects.get(slug="a").category == "Trí tuệ nhân tạo (AI)"


def test_values_outside_the_list_are_shown_and_can_be_replaced(staff_client):
    admin = staff_client(Role.SUPER_ADMIN)
    Order.objects.create(customer_name="C", source="Website · Facebook")
    unlisted = _kind(admin.get(URL).json(), "source")["unlisted"]
    assert {"value": "Website · Facebook", "used": 1} in unlisted
    bad = {"from": "Website · Facebook", "to": "Nope"}
    assert admin.post(f"{URL}source/replace/", bad).status_code == 400
    r = admin.post(f"{URL}source/replace/", {"from": "Website · Facebook", "to": "Website"}, format="json")
    assert r.json()["records"] == 1 and Order.objects.get(customer_name="C").source == "Website"


def test_system_values_are_only_ordered_and_values_fit_their_field(staff_client):
    admin = staff_client(Role.SUPER_ADMIN)
    web = ListItem.objects.get(kind="source", value="Website")
    assert _kind(admin.get(URL).json(), "source")["items"][0]["locked"] is True
    assert admin.patch(f"{URL}items/{web.id}/", {"value": "Web"}, format="json").status_code == 400
    assert admin.patch(f"{URL}items/{web.id}/", {"active": False}, format="json").status_code == 400
    assert admin.delete(f"{URL}items/{web.id}/").status_code == 400
    assert (
        admin.patch(f"{URL}items/{web.id}/", {"value": "Website", "active": True}, format="json").status_code
        == 200
    )
    assert admin.post(f"{URL}source/order/", {"ids": [web.id]}, format="json").status_code == 200
    too_long = "x" * 31  # Order.interest_level holds 30
    assert admin.post(f"{URL}interest_level/", {"value": too_long}, format="json").status_code == 400


def test_the_website_forms_use_the_lists(api, registration_payload):
    lists = api.get("/api/v1/public/lists/").json()
    assert (
        len(lists["provinces"]) == 34 and "Đại học" in lists["educationLevels"] and "Nữ" in lists["genders"]
    )

    bad = {**registration_payload, "gender": "abc"}
    assert api.post("/api/v1/public/registrations/", bad, format="json").status_code == 400
    payload = {
        **registration_payload,
        "source": "Website Form Tư vấn",
        "area": "tp hcm",
        "gender": "nữ",
        "educationLevel": "cử nhân",
        "attribution": {"last": {"source": "facebook", "medium": "cpc"}},
    }
    assert api.post("/api/v1/public/registrations/", payload, format="json").status_code == 201
    order = Order.objects.get()
    assert order.source == "Facebook ads"
    assert (order.learner.area, order.learner.gender, order.learner.education_level) == (
        "TP. Hồ Chí Minh",
        "Nữ",
        "Đại học",
    )
    Order.objects.all().delete()
    plain = {**registration_payload, "source": "anything", "attribution": {"last": {"source": "google"}}}
    api.post("/api/v1/public/registrations/", plain, format="json")
    assert Order.objects.get().source == "Google"


def test_older_sources_are_moved_into_the_list():
    import importlib

    from django.apps import apps as django_apps

    migration = importlib.import_module("apps.crm.migrations.0021_list_sources")
    for value in (
        "Website · Facebook",
        "Website Form Tư vấn · Truy cập trực tiếp",
        "Website Form Tư vấn",
        "GTNB",
    ):
        Order.objects.create(customer_name=value, source=value)
    migration.to_list(django_apps, None)
    got = dict(Order.objects.values_list("customer_name", "source"))
    assert got == {
        "Website · Facebook": "Facebook ads",
        "Website Form Tư vấn · Truy cập trực tiếp": "Website",
        "Website Form Tư vấn": "Website",
        "GTNB": "Giới thiệu nội bộ (GTNB)",
    }
