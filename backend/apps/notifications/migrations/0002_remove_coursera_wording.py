"""Seeded e-mail templates still described the LMS as "Coursera": replace exactly those sentences."""

from django.db import migrations

REPLACEMENTS = [
    ("TWings Academy &bull; Ngân Hàng MSB &bull; Coursera", "TWings Academy &bull; Ngân Hàng MSB"),
    (
        "<li>Được cấp tài khoản <strong>Coursera Enterprise LMS</strong> không giới hạn môn học.</li>",
        "<li>Được cấp tài khoản học trực tuyến <strong>TWings LMS</strong>, đăng nhập bằng email tại mục "
        "<strong>Vào học</strong>.</li>",
    ),
    (
        "Tài khoản học tập trên Coursera LMS đã được cấp quyền truy cập. Bạn có thể đăng nhập ngay bằng email "
        "này để xem trước tài liệu và video bài giảng.",
        "Tài khoản học trực tuyến (TWings LMS) được tạo tự động: bạn vào học bằng nút \"Vào học\" và đăng nhập "
        "bằng mã gửi tới email này.",
    ),
]


def fix_templates(apps, schema_editor):
    EmailTemplate = apps.get_model("notifications", "EmailTemplate")
    for template in EmailTemplate.objects.filter(body__icontains="coursera"):
        body = template.body
        for old, new in REPLACEMENTS:
            body = body.replace(old, new)
        if body != template.body:
            template.body = body
            template.save(update_fields=["body"])


class Migration(migrations.Migration):
    dependencies = [("notifications", "0001_initial")]

    operations = [migrations.RunPython(fix_templates, migrations.RunPython.noop)]
