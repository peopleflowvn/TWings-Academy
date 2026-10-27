"""
Data for the admissions end-to-end test (run inside Django: manage.py shell -c "exec(open(...).read())").
Seeds the public content (e-mail templates included), two courses with intakes (one of them
recruiting on the website under its own code), a consultant and five leads: one learner with two registrations, one late first response.
"""

from datetime import timedelta

from django.core.management import call_command
from django.utils import timezone

from apps.accounts.models import User
from apps.accounts.rbac import Role
from apps.catalog.models import Cohort, Course, Program
from apps.crm.assignment import assign_new_lead
from apps.crm.models import Order
from apps.crm.services import flag_duplicates

PASSWORD = "E2e-Test-Passw0rd!"

call_command("seed_content")
User.objects.create_superuser(email="admin@e2e.test", password=PASSWORD, name="Quản trị")
sale = User.objects.create_user(
    email="tuvan@e2e.test", password=PASSWORD, name="Tư vấn Lan", role=Role.SALES_CRM, is_staff=True
)
sale.receives_leads = True
sale.save()

rm = Course.objects.create(
    status="published", is_published=True, slug="e2e-rm", title="E2E RM Doanh nghiệp", price=8_490_000,
    installment_count=3, installment_interval_days=30,
)
gdv = Course.objects.create(status="published", is_published=True, slug="e2e-gdv", title="E2E Giao dịch viên", price=5_000_000)
Course.objects.create(status="draft", slug="e2e-draft", title="E2E Khóa nháp", price=1)  # not on sale
Program.objects.create(slug="e2e-goi", title="E2E Gói RM", price=12_000_000, is_published=True)
k9 = Cohort.objects.create(
    course=rm,
    name="E2E K9",
    start_date=timezone.localdate() + timedelta(days=20),
    registration_deadline=timezone.localdate() + timedelta(days=15),
    status="opening",
    code="CAMP-E2E",
    slug="chien-dich-e2e",
    capacity=10,
    is_published=True,
    show_quota=True,
    summary="Đợt tuyển sinh thử nghiệm E2E",
)
Cohort.objects.create(course=gdv, name="E2E GDV K3", start_date=timezone.localdate() + timedelta(days=10), status="opening")


def lead(name, phone, email, course, **extra):
    order = Order.objects.create(
        customer_name=name, customer_phone=phone, customer_email=email, course=course, course_title=course.title,
        amount=course.price, total_receivable=course.price, tuition_fee=course.price, **extra,
    )
    flag_duplicates(order)
    assign_new_lead(order)
    return order


lead("Nguyễn Văn An", "0912000001", "an@example.com", rm, cohort=k9, campaign_code="CAMP-E2E")
lead("Nguyễn Văn An", "0912000001", "an@example.com", gdv)  # the same learner, a second course
lead("Trần Thị Bình", "0912000002", "binh@example.com", rm, crm_status="3. Đang tư vấn")
lead("Lê Văn Cường", "0912000003", "", gdv, interest_level="Cao")
late = lead("Phạm Thị Dung", "0912000004", "dung@example.com", rm)
Order.objects.filter(pk=late.pk).update(response_due_at=timezone.now() - timedelta(hours=3))
# Overdue too, left alone by admissions_test.py: crm_test.py logs the contact from "Hôm nay của tôi".
slow = lead("Đỗ Văn Hùng", "0912000005", "hung@example.com", gdv)
Order.objects.filter(pk=slow.pk).update(response_due_at=timezone.now() - timedelta(hours=2))
# More than one kanban page in a column (30 per load): 32 leads to care for again.
for i in range(32):
    Order.objects.create(
        customer_name=f"Lead chăm sóc {i:02d}", customer_phone=f"09130000{i:02d}", course=gdv,
        course_title=gdv.title, crm_status="6. Chăm sóc lại",
    )
# A transfer whose memo has no order code (checkout_test.py credits it to the order it creates).
from apps.payments.models import BankTransaction  # noqa: E402

BankTransaction.objects.create(
    provider_txn_id="E2E-NO-CODE", transfer_type="in", amount=rm.price, content="CHUYEN TIEN HOC PHI E2E",
    transaction_date="2026-10-21 09:00:00", match_status="unmatched",
    match_note="Không tìm thấy mã đơn trong nội dung chuyển khoản",
)
print("e2e seed:", Order.objects.count(), "registrations")
