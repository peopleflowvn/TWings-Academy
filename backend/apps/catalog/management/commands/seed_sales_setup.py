"""
First sales setup, applied once (a rerun changes nothing, so staff edits are kept):
- installment plans on the higher-priced courses that have none yet,
- the first program: the two banking relationship-manager courses sold together.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import Course, Program, ProgramCourse

INSTALLMENTS = [(20_000_000, 4), (5_000_000, 2)]  # (minimum price, installments)
PROGRAM = {
    "slug": "chuyen-vien-quan-he-khach-hang-ngan-hang",
    "title": "Chuyên viên Quan hệ Khách hàng Ngân hàng (Cá nhân & Doanh nghiệp)",
    "subtitle": "Lộ trình trọn gói từ RM Cá nhân đến RM Doanh nghiệp & thẩm định tín dụng SME.",
    "description": (
        "Hai khóa thực chiến nối tiếp nhau: bắt đầu với nghiệp vụ Quan hệ Khách hàng Cá nhân, "
        "sau đó nâng lên "
        "Quan hệ Khách hàng Doanh nghiệp và thẩm định tín dụng SME. Học phí trọn gói thấp hơn mua lẻ, "
        "có thể trả góp 3 kỳ và vào học ngay sau kỳ đầu."
    ),
    "highlights": [
        "2 khóa thực chiến theo lộ trình RM Cá nhân → RM Doanh nghiệp",
        "Tiết kiệm hơn so với đăng ký từng khóa",
        "Trả góp 3 kỳ, vào học ngay sau kỳ đầu",
        "Chứng chỉ hoàn thành cho từng khóa, xác minh trực tuyến",
    ],
    "price": 13_990_000,
    "installment_count": 3,
    "installment_interval_days": 30,
}
PROGRAM_COURSES = ["quan-he-khach-hang-ca-nhan", "quan-he-khach-hang-doanh-nghiep-msb"]


class Command(BaseCommand):
    help = "Installment plans on high-priced courses and the first program (idempotent)."

    @transaction.atomic
    def handle(self, *args, **options):
        if Program.objects.filter(slug=PROGRAM["slug"]).exists():
            self.stdout.write("already set up: nothing changed (staff edits are kept)")
            return
        courses = [Course.objects.filter(slug=s).first() for s in PROGRAM_COURSES]
        if not all(courses):
            self.stdout.write("skipped: program courses not found")
            return

        for course in Course.objects.filter(installment_count=1, price__gte=INSTALLMENTS[-1][0]):
            course.installment_count = next(n for floor, n in INSTALLMENTS if course.price >= floor)
            course.save(update_fields=["installment_count", "updated_at"])
            self.stdout.write(f"installments: {course.slug} -> {course.installment_count}")

        program = Program.objects.create(
            **PROGRAM,
            original_price=sum(c.original_price or c.price for c in courses),
            thumbnail=courses[0].thumbnail,
            is_published=True,
        )
        ProgramCourse.objects.bulk_create(
            ProgramCourse(program=program, course=c, position=i) for i, c in enumerate(courses)
        )
        self.stdout.write(
            f"program: {program.slug} created, {program.price} vs {sum(c.price for c in courses)} separately"
        )
