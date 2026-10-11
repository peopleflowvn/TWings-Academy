"""
Read-only check of CRM data left by older screens (audit 11/10/2026). Changes nothing.

    python manage.py crm_data_check            # counts and a few examples (order codes only)
    python manage.py crm_data_check --json     # the same, as JSON (for the Ops workflow log)

What it reports:
- stage '5. Đã đóng phí' without the payment (set by the old card move / 'Gạch nợ' button);
- manual payments recorded for the whole balance of an installment order at once;
- PIC names that are not a staff member, and PIC without an assigned consultant;
- a class written as text without the intake (cohort) it belongs to;
- campaign codes that match no campaign (e.g. the old defaults CAMP-2026-Q4-HN, TW3);
- legacy payment columns still holding data (to decide whether they can be dropped);
- registrations without a learner, learners with several registrations, duplicate flags;
- e-mails already sent with the sample bank account of the old tuition template.
No names, phones, e-mails or identity numbers are printed.
"""

import json

from django.core.management.base import BaseCommand
from django.db.models import Count, Q

LEGACY_COLUMNS = {
    "paid_amount_l1": Q(paid_amount_l1__gt=0),
    "paid_amount_l2": Q(paid_amount_l2__gt=0),
    "payment_method_detail": ~Q(payment_method_detail=""),
    "payment_date": Q(payment_date__isnull=False),
    "transaction_code": ~Q(transaction_code=""),
    "bank_account_number": ~Q(bank_account_number=""),
    "bank_name": ~Q(bank_name=""),
    "referral_commission": Q(referral_commission__gt=0),
    "payment_note": ~Q(payment_note=""),
}
OLD_DEFAULT_CODES = ["CAMP-2026-Q4-HN", "TW3"]
OLD_DEFAULT_PICS = ["HuongNT22", "TuanNM", "PhuongVU", "ChiNK", "TungLH"]


def _codes(qs, n=10):
    return list(qs.values_list("order_code", flat=True)[:n])


def collect() -> dict:
    from apps.accounts.models import User
    from apps.crm.models import AdmissionCampaign, Learner, Order
    from apps.payments.models import Payment

    leads = Order.objects.filter(parent__isnull=True)
    report: dict = {"registrations": leads.count(), "learners": Learner.objects.count()}

    paid_stage_unpaid = leads.filter(crm_status="5. Đã đóng phí").exclude(status="paid")
    report["paid_stage_without_payment"] = {
        "count": paid_stage_unpaid.count(),
        "with_some_payment": paid_stage_unpaid.filter(total_paid_amount__gt=0).count(),
        "examples": _codes(paid_stage_unpaid),
    }

    manual = Payment.objects.filter(order__installment_count__gt=1, source="manual")
    whole_balance = [
        p.order.order_code
        for p in manual.select_related("order")
        if p.order.installments.exists()
        and p.amount > p.order.installments.order_by("sequence").first().amount
    ]
    report["installment_orders_with_large_manual_payment"] = {
        "count": len(whole_balance),
        "examples": whole_balance[:10],
        "note": "Kiểm tra với sao kê: khoản xác nhận thủ công lớn hơn kỳ đầu (có thể đã ghi cả số còn nợ).",
    }

    staff_names = {n for n in User.objects.filter(is_staff=True).values_list("name", flat=True) if n}
    staff_names |= set(User.objects.filter(is_staff=True).values_list("email", flat=True))
    pics = leads.exclude(pic="").values("pic").annotate(n=Count("id")).order_by("-n")
    report["pic"] = {
        "not_a_staff_member": [
            {"pic": p["pic"], "count": p["n"]} for p in pics if p["pic"] not in staff_names
        ][:20],
        "old_default_names": leads.filter(pic__in=OLD_DEFAULT_PICS).count(),
        "pic_without_assigned_consultant": leads.exclude(pic="").filter(assigned_to__isnull=True).count(),
    }

    text_class = leads.exclude(batch_cohort="").filter(cohort__isnull=True)
    report["class_without_intake"] = {
        "count": text_class.count(),
        "values": [
            {"class": r["batch_cohort"], "count": r["n"]}
            for r in text_class.values("batch_cohort").annotate(n=Count("id")).order_by("-n")[:20]
        ],
    }

    codes = {c.lower() for c in AdmissionCampaign.objects.values_list("code", flat=True)}
    unknown = [
        {"code": r["campaign_code"], "count": r["n"]}
        for r in leads.exclude(campaign_code="")
        .values("campaign_code")
        .annotate(n=Count("id"))
        .order_by("-n")
        if r["campaign_code"].lower() not in codes
    ]
    report["campaign_codes_without_campaign"] = {
        "values": unknown[:30],
        "old_defaults": leads.filter(campaign_code__in=OLD_DEFAULT_CODES, campaign__isnull=True).count(),
    }

    from apps.notifications.models import EmailLog

    # E-mails that went out with the sample account of the old tuition template (fixed 11/10/2026).
    sample = EmailLog.objects.filter(rendered_html__contains="03001010099999")
    report["emails_sent_with_sample_bank_account"] = {
        "count": sample.exclude(status__in=("failed", "simulated")).count(),
        "simulated_or_failed": sample.filter(status__in=("failed", "simulated")).count(),
        "orders": list(sample.exclude(order=None).values_list("order__order_code", flat=True)[:20]),
        "note": "Liên hệ các học viên này: số tài khoản trong thư không phải tài khoản nhận học phí.",
    }

    report["legacy_payment_columns"] = {
        name: Order.objects.filter(q).count() for name, q in LEGACY_COLUMNS.items()
    }

    report["learners_check"] = {
        "registrations_without_learner": leads.filter(learner__isnull=True).count(),
        "learners_with_several_registrations": Learner.objects.annotate(
            n=Count("orders", filter=Q(orders__parent__isnull=True))
        )
        .filter(n__gt=1)
        .count(),
        "registrations_flagged_duplicate": leads.filter(is_duplicate=True).count(),
    }
    return report


class Command(BaseCommand):
    help = "Read-only report of CRM data left by older screens (changes nothing)."

    def add_arguments(self, parser):
        parser.add_argument("--json", action="store_true", help="Print JSON.")

    def handle(self, *args, **options):
        report = collect()
        if options["json"]:
            self.stdout.write(json.dumps(report, ensure_ascii=False, indent=2, default=str))
            return
        for key, value in report.items():
            self.stdout.write(f"{key}: {json.dumps(value, ensure_ascii=False, default=str)}")
