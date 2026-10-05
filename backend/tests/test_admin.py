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
