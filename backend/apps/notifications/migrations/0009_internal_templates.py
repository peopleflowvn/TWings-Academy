"""
The e-mails that were still written in code become templates editable in /app/content/email: the staff
notices (lead assigned, unassigned, overdue, escalation, appointment reminder to the consultant, corporate
requests near their SLA; category "internal") and the corporate result e-mails (to the learner and the
digest to the line manager). Only the missing ones are created: a template already there is kept.

The sentences code used to build ({{plan}}, {{due_phrase}}, {{balance_status}}, {{where}}...) are now in
the templates, as {{#if}} sections. A standard template still as migration 0008 wrote it gets the new
version; one edited by staff since is kept (code still fills its old variables).
"""

import hashlib

from django.db import migrations, models

NEW = (
    "corporate_results",
    "corporate_manager_digest",
    "crm_lead_assigned",
    "crm_lead_unassigned",
    "crm_leads_overdue",
    "crm_leads_escalation",
    "crm_appointment_staff_reminder",
    "corporate_request_sla",
)

# sha256(subject + newline + body) of the 0008 version of the templates changed here.
PREVIOUS = {
    "checkout_received": "66af94fe596243cfa7a12e95c5c39e9e0d1773954a5c18775ecc5749f2b0db5f",
    "installment_reminder": "62be8005f1eade3ef3bca99bde399d2586607d6d8c26308ea00ce7b5a40e9fcd",
    "payment_receipt": "b6841135bd7a68dd8329bf91f31c923cf2f43508975fc6668d31a95dc28fb7c5",
    "lms_certificate": "63d944bde0148b7155ecc9b4396d658cd4e25b4fa40bdb30ff11fc3c70e9b537",
    "journey_completed_next": "386b694096b492c6f7f2bce97b37884fd0c69e41ff4ee187617e58c915216dfe",
    "appointment_confirmation": "25fc63bb5a01d43937797821ebb4ac1b5d39843edcc60d5a3a74a6456a5a147e",
    "appointment_reminder": "2dde5384482135c4b9bb54bb4919ee00da1d0bab81e0bdc96d06ad6d72fbd944",
}


def _fields(t):
    return {
        "name": t["name"],
        "category": t["category"],
        "subject": t["subject"],
        "body": t["body"],
        "variables": t["variables"],
        "description": t["description"],
        "is_default": True,
    }


def forwards(apps, schema_editor):
    from apps.notifications.defaults import BY_CODE

    EmailTemplate = apps.get_model("notifications", "EmailTemplate")
    for code in NEW:
        EmailTemplate.objects.get_or_create(code=code, defaults=_fields(BY_CODE[code]))
    for code, digest in PREVIOUS.items():
        stored = EmailTemplate.objects.filter(code=code).first()
        if stored is None:
            EmailTemplate.objects.create(code=code, **_fields(BY_CODE[code]))
            continue
        if hashlib.sha256(f"{stored.subject}\n{stored.body}".encode()).hexdigest() == digest:
            for field, value in _fields(BY_CODE[code]).items():
                setattr(stored, field, value)
            stored.save()


class Migration(migrations.Migration):
    dependencies = [("notifications", "0008_standard_templates_v2")]

    operations = [
        migrations.AlterField(
            model_name="emailtemplate",
            name="category",
            field=models.CharField(
                choices=[
                    ("admission", "Tuyển sinh"),
                    ("payment", "Thanh toán & Hóa đơn"),
                    ("lms", "Đào tạo LMS"),
                    ("crm", "Chăm sóc học viên (CRM)"),
                    ("security", "Bảo mật & Tài khoản"),
                    ("corporate", "Doanh nghiệp (B2B)"),
                    ("scheduling", "Lịch học"),
                    ("marketing", "Marketing"),
                    ("internal", "Thông báo nội bộ"),
                ],
                default="admission",
                max_length=20,
            ),
        ),
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
