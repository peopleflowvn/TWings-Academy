import re

import pytest
from rest_framework.test import APIClient

from apps.accounts.rbac import Role
from apps.core.models import AuditLog
from apps.notifications.models import EmailLog

from .conftest import make_staff

pytestmark = pytest.mark.django_db

PASSWORD = "Very-Strong-Passw0rd!"


def _login(client, email, password=PASSWORD):
    return client.post("/api/v1/auth/login/", {"email": email, "password": password}, format="json")


def test_missing_session_is_401_so_the_spa_can_show_the_login_form():
    assert APIClient().get("/api/v1/auth/me/").status_code == 401
    assert APIClient().get("/api/v1/staff/orders/").status_code == 401


def test_change_password_keeps_this_session_and_checks_the_current_one():
    user = make_staff(Role.SALES_CRM)
    client = APIClient()
    assert _login(client, user.email).status_code == 200
    url = "/api/v1/auth/password/change/"
    wrong = {"currentPassword": "wrong-password!!", "newPassword": "Another-Strong-Pw9"}
    res = client.post(url, wrong, format="json")
    assert res.status_code == 400 and "currentPassword" in res.json()
    res = client.post(url, {"currentPassword": PASSWORD, "newPassword": "123456789012"}, format="json")
    assert res.status_code == 400 and "newPassword" in res.json()
    res = client.post(url, {"currentPassword": PASSWORD, "newPassword": "Another-Strong-Pw9"}, format="json")
    assert res.status_code == 204
    assert client.get("/api/v1/auth/me/").status_code == 200
    user.refresh_from_db()
    assert user.check_password("Another-Strong-Pw9")
    assert AuditLog.objects.filter(action="auth.password_change", object_id=user.pk).exists()


def test_password_reset_flow_never_stores_the_link_and_is_single_use():
    user = make_staff(Role.FINANCE_ACCOUNTANT)
    other_session = APIClient()
    assert _login(other_session, user.email).status_code == 200

    sent = []
    import apps.notifications.resend as resend

    original = resend.send_email
    resend.send_email = lambda **kw: sent.append(kw) or None
    try:
        url = "/api/v1/auth/password/reset/"
        unknown = APIClient().post(url, {"email": "nobody@twings.test"}, format="json")
        res = APIClient().post(url, {"email": user.email.upper()}, format="json")
    finally:
        resend.send_email = original
    assert unknown.status_code == res.status_code == 200 and unknown.json() == res.json()
    assert len(sent) == 1
    uid, token = re.search(r"#reset=([^.\"]+)\.([^\"]+)\"", sent[0]["html"]).groups()
    log = EmailLog.objects.get(template_code="staff_password_reset")
    assert token not in log.rendered_html

    confirm = "/api/v1/auth/password/reset/confirm/"
    payload = {"uid": uid, "token": token, "newPassword": "Brand-New-Passw0rd"}
    assert APIClient().post(confirm, {**payload, "token": "bad-token"}, format="json").status_code == 400
    assert APIClient().post(confirm, payload, format="json").status_code == 200
    assert APIClient().post(confirm, payload, format="json").status_code == 400  # single use
    assert other_session.get("/api/v1/auth/me/").status_code == 401  # old sessions end
    assert _login(APIClient(), user.email, "Brand-New-Passw0rd").status_code == 200


def test_admin_sends_a_reset_link_without_learning_the_password(staff_client):
    target = make_staff(Role.SALES_CRM)
    url = f"/api/v1/staff/users/{target.pk}/send-password-reset/"
    assert staff_client(Role.ACADEMIC_MANAGEMENT).post(url).status_code == 403  # view_users only
    res = staff_client(Role.SUPER_ADMIN).post(url)
    assert res.status_code == 200 and target.email in res.json()["detail"]
    assert EmailLog.objects.filter(
        template_code="staff_password_reset", recipient_email=target.email
    ).exists()
    assert AuditLog.objects.filter(action="staff_user.password_reset_sent", object_id=target.pk).exists()
    target.is_active = False
    target.save(update_fields=["is_active"])
    assert staff_client(Role.SUPER_ADMIN).post(url).status_code == 400


def test_only_a_super_admin_can_set_a_super_admin_password():
    from apps.accounts.models import User

    boss = make_staff(Role.SUPER_ADMIN)
    manager = make_staff(Role.ACADEMIC_MANAGEMENT)
    manager.permission_overrides = {"granted": ["rbac.manage_roles"], "revoked": []}
    manager.save(update_fields=["permission_overrides"])
    client = APIClient()
    client.force_authenticate(manager)
    url = f"/api/v1/staff/users/{boss.pk}/"
    assert client.patch(url, {"password": "Takeover-Passw0rd!"}, format="json").status_code == 403
    assert User.objects.get(pk=boss.pk).check_password(PASSWORD)
    sales = make_staff(Role.SALES_CRM)
    res = client.patch(f"/api/v1/staff/users/{sales.pk}/", {"password": "Temporary-Passw0rd!"}, format="json")
    assert res.status_code == 200
