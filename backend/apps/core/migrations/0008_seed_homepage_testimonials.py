"""Seed default student testimonials (cảm nhận học viên) into homepage_sections."""

from django.db import migrations

TESTIMONIALS = [
    {
        "id": "t-1",
        "name": "Nguyễn Thu Hà",
        "role": "Chuyên viên QHKH Cá nhân (RM) · MSB",
        "avatar": "",
        "quote": (
            "Mình tốt nghiệp ngành Quản trị kinh doanh, chưa có kiến thức chuyên sâu về tín dụng. "
            "Nhờ khóa học thực chiến tại TWings, mình được thực hành trực tiếp trên hồ sơ vay thật, "
            "lập báo cáo thẩm định thực tế. Ngay sau khóa học 1 tháng, mình đã tự tin vượt qua 3 vòng "
            "phỏng vấn và trúng tuyển MSB."
        ),
        "outcome": "Trúng tuyển RM Cá nhân tại MSB sau 1 tháng tốt nghiệp",
    },
    {
        "id": "t-2",
        "name": "Trần Minh Quân",
        "role": "Chuyên viên Tín dụng Doanh nghiệp · Techcombank",
        "avatar": "",
        "quote": (
            "Khác với những khóa học lý thuyết ở trường, các giảng viên tại TWings đều là Giám đốc chi nhánh "
            "và Trưởng phòng thẩm định. Từng buổi học 'bóc tách' báo cáo tài chính, nhận diện rủi ro dòng tiền "
            "và phương án tài sản bảo đảm đã giúp mình tự tin xử lý những hồ sơ doanh nghiệp phức tạp."
        ),
        "outcome": "Thăng tiến vị trí Quản lý Khách hàng Doanh nghiệp",
    },
    {
        "id": "t-3",
        "name": "Lê Hoàng Yến",
        "role": "Chuyên viên Hỗ trợ Tín dụng (CSR) · VPBank",
        "avatar": "",
        "quote": (
            "Khóa học ngắn nhưng cực kỳ cô đọng và thực tế. Mình ấn tượng nhất là buổi thực hành mô phỏng "
            "hội đồng tín dụng với các giám khảo từ ngân hàng. Sự tự tin và tác phong chuyên nghiệp rèn luyện "
            "ở TWings chính là chìa khóa giúp mình gia nhập VPBank."
        ),
        "outcome": "Gia nhập VPBank ngay sau khi hoàn thành khóa học",
    },
    {
        "id": "t-4",
        "name": "Phạm Quốc Tuấn",
        "role": "Chuyên viên Thẩm định Rủi ro · MB Bank",
        "avatar": "",
        "quote": (
            "Chuyển ngành từ kỹ thuật sang tài chính ngân hàng từng khiến mình rất lo lắng. Nhưng lộ trình học "
            "bài bản tại TWings từ cơ bản đến nâng cao cùng sự đồng hành tận tình của các mentor đã giúp mình "
            "san bằng khoảng cách kiến thức và bắt nhịp công việc ngân hàng nhanh chóng."
        ),
        "outcome": "Chuyển ngành thành công sang Tài chính - Ngân hàng",
    },
    {
        "id": "t-5",
        "name": "Vũ Mai Phương",
        "role": "Giao dịch viên (Teller) · TPBank",
        "avatar": "",
        "quote": (
            "Hệ thống case study thực tế và các tình huống xử lý khiếu nại khách hàng trong khóa học sát với "
            "công việc hàng ngày đến 95%. Khi bước vào ngân hàng thử việc, mình hầu như không bị bỡ ngỡ mà "
            "tự tin thao tác giao dịch và tư vấn chéo sản phẩm ngay tuần đầu tiên."
        ),
        "outcome": "Đạt danh hiệu Giao dịch viên triển vọng trong kỳ thử việc",
    },
    {
        "id": "t-6",
        "name": "Đặng Hoàng Long",
        "role": "Chuyên viên QHKH Doanh nghiệp SME · VietinBank",
        "avatar": "",
        "quote": (
            "Giảng viên TWings hướng dẫn cách đọc 'vị' doanh nghiệp qua dòng tiền thực và khảo sát thực địa "
            "cực kỳ sâu sắc. Những kiến thức thực chiến này không sách vở nào dạy mà phải từ hàng chục năm "
            "kinh nghiệm thương trường mới đúc kết được. Rất biết ơn các thầy cô tại TWings!"
        ),
        "outcome": "Vượt 130% chỉ tiêu KPI tín dụng quý đầu tiên",
    },
]


def seed_homepage_testimonials(apps, schema_editor):
    SiteConfig = apps.get_model("core", "SiteConfig")
    doc, _ = SiteConfig.objects.get_or_create(key="homepage_sections")
    data = dict(doc.data or {})

    testimonials = data.get("testimonials")
    if not isinstance(testimonials, dict):
        testimonials = {
            "enabled": True,
            "title": "Cảm nhận của học viên TWings Academy",
            "subtitle": (
                "Hơn 5.000 học viên đã nâng tầm năng lực và tự tin bứt phá sự nghiệp cùng TWings Academy."
            ),
            "items": TESTIMONIALS,
        }
        data["testimonials"] = testimonials
        doc.data = data
        doc.save(update_fields=["data", "updated_at"])
    elif not testimonials.get("items"):
        testimonials["enabled"] = testimonials.get("enabled", True)
        testimonials.setdefault("title", "Cảm nhận của học viên TWings Academy")
        testimonials.setdefault(
            "subtitle",
            "Hơn 5.000 học viên đã nâng tầm năng lực và tự tin bứt phá sự nghiệp cùng TWings Academy.",
        )
        testimonials["items"] = TESTIMONIALS
        data["testimonials"] = testimonials
        doc.data = data
        doc.save(update_fields=["data", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [("core", "0007_alter_siteconfig_key")]

    operations = [migrations.RunPython(seed_homepage_testimonials, migrations.RunPython.noop)]
