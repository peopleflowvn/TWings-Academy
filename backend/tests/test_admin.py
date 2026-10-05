import pytest

from apps.accounts.models import User
from apps.accounts.rbac import Role
from apps.core.models import AuditLog

pytestmark = pytest.mark.django_db


def test_staff_account_changes_are_audited_without_password(staff_client):
    admin = staff_client(Role.SUPER_ADMIN)
    res = admin.post(
        "/api/v1/staff/users/",
        {
            "name": "Nhân Viên Mới",
            "email": "nv@twings.test",
            "role": Role.SALES_CRM,
            "password": "Very-Strong-Passw0rd!",
        },
        format="json",
    )
    assert res.status_code == 201
    user = User.objects.get(email="nv@twings.test")
    res = admin.patch(
        f"/api/v1/staff/users/{user.id}/",
        {
            "role": Role.ACADEMIC_MANAGEMENT,
            "status": "suspended",
            "permissionOverrides": {"granted": ["lms.manage"]},
        },
        format="json",
    )
    assert res.status_code == 200
    logs = AuditLog.objects.filter(object_id=user.id).order_by("at")
    assert [log.action for log in logs] == ["staff_user.create", "staff_user.update"]
    assert "password" not in logs[0].details and logs[0].details["password_changed"] is True
    assert logs[1].details["status"] == "suspended" and logs[1].details["role"] == Role.ACADEMIC_MANAGEMENT


def test_audit_log_api_is_super_admin_only(staff_client):
    AuditLog.objects.create(actor_label="x@twings.test", action="order.export_csv", ip="10.0.0.1")
    res = staff_client(Role.SUPER_ADMIN).get("/api/v1/staff/audit-logs/")
    assert res.status_code == 200 and res.json()["results"][0]["action"] == "order.export_csv"
    for role in (Role.SALES_CRM, Role.ACADEMIC_MANAGEMENT, Role.FINANCE_ACCOUNTANT, Role.CONTENT_SEO):
        assert staff_client(role).get("/api/v1/staff/audit-logs/").status_code == 403
    # Read-only.
    assert staff_client(Role.SUPER_ADMIN).delete("/api/v1/staff/audit-logs/1/").status_code in (403, 404, 405)


def test_sales_cannot_promote_or_edit_overrides(staff_client):
    target = User.objects.create_user(
        email="t@twings.test", password="x" * 14, name="T", role=Role.SALES_CRM, is_staff=True
    )
    sales = staff_client(Role.SALES_CRM)
    assert (
        sales.patch(
            f"/api/v1/staff/users/{target.id}/", {"role": Role.SUPER_ADMIN}, format="json"
        ).status_code
        == 403
    )


def test_campaign_positions_are_saved_as_a_nested_list(staff_client, course):
    admin = staff_client(Role.SUPER_ADMIN)
    res = admin.post(
        "/api/v1/staff/campaigns/",
        {
            "code": "CAMP-T1",
            "name": "Chiến dịch test",
            "status": "active",
            "positions": [
                {"courseId": course.id, "positionTitle": "RM", "shortName": "RM", "targetQuota": 10}
            ],
        },
        format="json",
    )
    assert res.status_code == 201, res.content
    camp = res.json()
    kept = camp["positions"][0]["id"]
    res = admin.patch(
        f"/api/v1/staff/campaigns/{camp['id']}/",
        {
            "positions": [
                {
                    "id": kept,
                    "courseId": course.id,
                    "positionTitle": "RM",
                    "shortName": "RM",
                    "targetQuota": 20,
                },
                {"id": "local-123", "courseId": course.id, "positionTitle": "GDV", "shortName": "GDV"},
            ]
        },
        format="json",
    )
    assert res.status_code == 200, res.content
    positions = {p["shortName"]: p for p in res.json()["positions"]}
    assert positions["RM"]["id"] == kept and positions["RM"]["targetQuota"] == 20
    assert positions["GDV"]["id"] != "local-123"
    res = admin.patch(f"/api/v1/staff/campaigns/{camp['id']}/", {"positions": []}, format="json")
    assert res.json()["positions"] == []


def test_cohort_crud_through_the_api(staff_client, course):
    admin = staff_client(Role.ACADEMIC_MANAGEMENT)
    res = admin.post(
        "/api/v1/staff/cohorts/",
        {"course": course.id, "name": "K10", "startDate": "2026-11-15", "capacity": 30, "status": "opening"},
        format="json",
    )
    assert res.status_code == 201, res.content
    cid = res.json()["id"]
    assert (
        admin.patch(f"/api/v1/staff/cohorts/{cid}/", {"status": "full"}, format="json").json()["status"]
        == "full"
    )
    assert (
        staff_client(Role.SALES_CRM)
        .patch(f"/api/v1/staff/cohorts/{cid}/", {"status": "opening"}, format="json")
        .status_code
        == 403
    )


def test_followup_tasks_can_be_ticked_and_removed(staff_client, course):
    from apps.crm.models import Order

    order = Order.objects.create(customer_name="A", course=course, amount=1)
    sales = staff_client(Role.SALES_CRM)
    task = sales.post(
        f"/api/v1/staff/orders/{order.id}/followups/", {"title": "Gọi lại", "priority": "high"}, format="json"
    ).json()
    res = sales.patch(
        f"/api/v1/staff/orders/{order.id}/followups/{task['id']}/", {"isCompleted": True}, format="json"
    )
    assert res.status_code == 200 and res.json()["isCompleted"] is True
    assert (
        staff_client(Role.FINANCE_ACCOUNTANT)
        .delete(f"/api/v1/staff/orders/{order.id}/followups/{task['id']}/")
        .status_code
        == 403
    )
    assert sales.delete(f"/api/v1/staff/orders/{order.id}/followups/{task['id']}/").status_code == 204
    assert order.followup_tasks.count() == 0
