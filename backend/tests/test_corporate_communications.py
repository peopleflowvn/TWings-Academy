"""Corporate class e-mails: one per learner, CC the line manager under the recipient policy, .ics."""

import base64
import itertools
from datetime import date, timedelta

import pytest
from django.utils import timezone

from apps.accounts.rbac import Role
from apps.catalog.models import CohortSession
from apps.corporate import services
from apps.corporate.communications import cc_policy, class_calendar, recipients
from apps.crm.models import Learner
from apps.notifications import resend
from apps.notifications.models import EmailLog

pytestmark = pytest.mark.django_db


@pytest.fixture
def cls(course):
    client = services.create_client(
        name="Ngân hàng Mẫu", code="NHM", email_domains=["nhm.test"], default_cc=["daotao@nhm.test"]
    )
    return services.create_class(
        client=client, course=course, name="NHM – Lớp 1, khóa 2026", cohort_fields={"location": "Hội sở"}
    )


def _listing(cls, email="binh@nhm.test", **employment):
    learner = Learner.objects.create(full_name="Trần Thị Bình", email=email)
    return services.list_learner(cls, learner, **employment)


@pytest.fixture
def resend_calls(settings, monkeypatch):
    settings.RESEND_API_KEY = "re_test_only"
    calls, ids = [], itertools.count(1)

    class Ok:
        status_code = 200

        @staticmethod
        def json():
            return {"id": f"msg-{next(ids)}"}

    monkeypatch.setattr(resend.requests, "post", lambda url, json, **kw: calls.append(json) or Ok())
    return calls


def test_cc_policy_keeps_client_and_internal_domains(cls, settings):
    settings.CORPORATE_INTERNAL_EMAIL_DOMAINS = ["twings.edu.vn"]
    allowed, rejected = cc_policy(
        cls.client, ["QL@nhm.test", "pm@twings.edu.vn", "ban@gmail.com", "ql@nhm.test", ""]
    )
    assert allowed == ["ql@nhm.test", "pm@twings.edu.vn"] and rejected == ["ban@gmail.com"]


def test_cc_is_the_manager_on_the_day_of_sending(cls):
    listing = _listing(cls, manager_email="cu@nhm.test")
    services.ensure_employee(
        cls.client, listing.learner, on=date.today() + timedelta(days=10), manager_email="moi@nhm.test"
    )
    today = recipients(listing)
    later = recipients(listing, date.today() + timedelta(days=11))
    assert today["to"] == "binh@nhm.test" and today["cc"] == ["cu@nhm.test", "daotao@nhm.test"]
    assert later["cc"] == ["moi@nhm.test", "daotao@nhm.test"]


def test_calendar_file_is_valid_ics(cls):
    start = timezone.now().replace(microsecond=0) + timedelta(days=2)
    for i in range(2):
        CohortSession.objects.create(
            cohort=cls.cohort,
            title=f"Buổi {i + 1}: nhập môn, thực hành; " + "rất dài " * 10,
            starts_at=start + timedelta(days=i),
            ends_at=start + timedelta(days=i, hours=3),
        )
    ics = class_calendar(cls).decode()
    assert ics.startswith("BEGIN:VCALENDAR\r\n") and ics.endswith("END:VCALENDAR\r\n")
    assert ics.count("BEGIN:VEVENT") == 2 and "LOCATION:Hội sở" in ics
    assert "nhập môn\\, thực hành\\;" in ics.replace("\r\n ", "")  # escaped, then unfolded
    assert all(len(line.encode()) <= 75 for line in ics.split("\r\n"))


def test_invitations_preview_and_send(cls, staff_client, resend_calls):
    corp = staff_client(Role.CORPORATE_TRAINING)
    url = f"/api/v1/staff/corporate/classes/{cls.pk}/invitations/"
    _listing(cls, manager_email="ql@nhm.test")
    _listing(cls, email="cuong@nhm.test", manager_email="sep@gmail.com")
    assert corp.post(url).status_code == 400  # no schedule yet

    start = timezone.now() + timedelta(days=3)
    CohortSession.objects.create(
        cohort=cls.cohort, title="Buổi 1", starts_at=start, ends_at=start + timedelta(hours=2)
    )
    preview = corp.get(url).json()
    by_to = {r["to"]: r for r in preview}
    assert by_to["cuong@nhm.test"]["rejected"] == ["sep@gmail.com"]
    assert by_to["cuong@nhm.test"]["cc"] == ["daotao@nhm.test"]

    assert staff_client(Role.ACADEMIC_MANAGEMENT).post(url).status_code == 403
    assert corp.post(url).json() == {"sent": 2, "failed": 0}
    assert len(resend_calls) == 2 and all(len(c["to"]) == 1 for c in resend_calls)  # one message per learner
    binh = next(c for c in resend_calls if c["to"] == ["binh@nhm.test"])
    assert binh["cc"] == ["ql@nhm.test", "daotao@nhm.test"] and "sep@gmail.com" not in str(resend_calls)
    attachment = binh["attachments"][0]
    assert attachment["filename"] == "lich-hoc.ics" and b"BEGIN:VEVENT" in base64.b64decode(
        attachment["content"]
    )
    log = EmailLog.objects.get(recipient_email="binh@nhm.test")
    assert log.cc == ["ql@nhm.test", "daotao@nhm.test"] and log.corporate_enrollment is not None
    assert log.attachment_names == ["lich-hoc.ics"] and log.status == "sent"

    assert corp.post(url).json() == {"sent": 0, "failed": 0}  # only those not invited yet
    assert corp.post(url, {"all": True}, format="json").json()["sent"] == 2
