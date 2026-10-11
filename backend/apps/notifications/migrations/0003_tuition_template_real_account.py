"""
The seeded tuition e-mail ('vietqr_tuition_invoice') carried a sample bank account (03001010099999), a
QR code for it with a fixed amount (8.490.000đ) and a memo the bank webhook does not match. A learner
paying from that e-mail would send money to the wrong account. Every template is rewritten to use the
order's real payment instructions ({{qrImageUrl}}, {{bankName}}, {{accountNumber}}, {{accountName}},
{{transferContent}}, {{amount}} = amount due now); the rest of what staff wrote is kept.
"""

import re

from django.db import migrations

SAMPLE_ACCOUNT = "03001010099999"
REPLACEMENTS = [
    # the QR image of the sample account (any amount / memo) -> the order's own VietQR image
    (re.compile(r"https://img\.vietqr\.io/image/[A-Za-z]+-" + SAMPLE_ACCOUNT + r"[^\"'\s>]*"), "{{qrImageUrl}}"),
    (re.compile(r"(<strong>Ngân hàng:</strong>\s*)Ngân hàng TMCP Hàng Hải Việt Nam \(MSB\)"), r"\1{{bankName}}"),
    (re.compile(r"(<strong>Chủ tài khoản:</strong>\s*)CONG TY CP TWINGS ACADEMY"), r"\1{{accountName}}"),
    (re.compile(r"TW3 \{\{orderCode\}\}( \{\{customerName\}\})?"), "{{transferContent}}"),
    (
        re.compile(r"\* Lưu ý: Hệ thống Webhook của ngân hàng MSB[^<]*"),
        "* Chuyển khoản đúng số tiền và nội dung ở trên để hệ thống tự ghi nhận học phí.",
    ),
    (re.compile(SAMPLE_ACCOUNT), "{{accountNumber}}"),
]
PAYMENT_VARIABLES = ["qrImageUrl", "bankName", "accountNumber", "accountName", "transferContent", "amount"]


def fix_body(body: str) -> str:
    for pattern, repl in REPLACEMENTS:
        body = pattern.sub(repl, body)
    return body


def forwards(apps, schema_editor):
    EmailTemplate = apps.get_model("notifications", "EmailTemplate")
    for template in EmailTemplate.objects.filter(body__contains=SAMPLE_ACCOUNT):
        template.body = fix_body(template.body)
        template.subject = fix_body(template.subject)
        variables = list(template.variables or [])
        template.variables = variables + [v for v in PAYMENT_VARIABLES if v not in variables]
        template.save(update_fields=["body", "subject", "variables", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [("notifications", "0002_remove_coursera_wording")]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
