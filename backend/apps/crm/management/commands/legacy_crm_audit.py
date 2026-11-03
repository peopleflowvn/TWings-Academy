"""
Read-only audit of the old CRM's records brought into this system (apps.crm.legacy_import). Changes
nothing; prints counts and order codes only (no names, phones, e-mails or identity numbers).

    python manage.py legacy_crm_audit

Checks that each record is what the import promises: classes taught elsewhere (no Moodle, off the site),
learners in them paid or studying on a first installment, cancelled ones out of classes, no e-mail and no
Moodle enrolment for anyone imported, no reminder / journey / alert waiting for them, the option lists
respected, and the RB / EB class 9 open for sale.
"""

from collections import Counter

from django.core.management.base import BaseCommand
from django.db.models import Count, Q, Sum
from django.utils import timezone


class Command(BaseCommand):
    help = "Kiểm tra (chỉ đọc) dữ liệu CRM cũ đã nhập."

    def handle(self, *args, **options):
        from apps.catalog.models import Cohort
        from apps.crm import journeys
        from apps.crm.assignment import overdue_leads
        from apps.crm.legacy_import import EB, RB
        from apps.crm.lists import values
        from apps.crm.models import Installment, Learner, Order
        from apps.lms.models import LmsEnrollment
        from apps.notifications.models import EmailLog
        from apps.payments.models import Payment, Refund

        sources, interest_levels, training_statuses = (
            values(k, include_hidden=True) for k in ("source", "interest_level", "training_status")
        )
        out = self.stdout.write
        problems = []

        def check(ok, text, codes=()):
            mark = "OK " if ok else "LỖI"
            out(f"[{mark}] {text}" + (f" — {', '.join(list(codes)[:10])}" if codes and not ok else ""))
            if not ok:
                problems.append(text)

        legacy = Order.objects.filter(attribution__has_key="legacy_code")
        n = legacy.count()
        out(
            f"== Đăng ký nhập từ CRM cũ: {n}; "
            f"học viên liên quan: {Learner.objects.filter(orders__in=legacy).distinct().count()}"
        )
        codes = Counter(legacy.values_list("attribution__legacy_code", flat=True))
        check(
            all(v == 1 for v in codes.values()),
            "mỗi mã đăng ký cũ chỉ nhập một lần",
            [c for c, v in codes.items() if v > 1],
        )
        out(
            "   giai đoạn: "
            + ", ".join(
                f"{k}: {v}" for k, v in sorted(Counter(legacy.values_list("crm_status", flat=True)).items())
            )
        )
        out(
            "   trạng thái đơn: "
            + ", ".join(
                f"{k}: {v}" for k, v in sorted(Counter(legacy.values_list("status", flat=True)).items())
            )
        )
        check(
            not legacy.filter(learner__isnull=True).exists(),
            "đăng ký nào cũng gắn với học viên",
            legacy.filter(learner__isnull=True).values_list("order_code", flat=True),
        )

        # ---- classes
        out("== Lớp cũ (học trên nền tảng khác)")
        external = Cohort.objects.filter(external_lms=True).select_related("course").order_by("code")
        for c in external.annotate(
            n=Count("orders"),
            access=Count("orders", filter=Q(orders__learning_access=True)),
            receivable=Sum("orders__total_receivable"),
            paid=Sum("orders__total_paid_amount"),
        ):
            out(
                f"   {c.code:6} {c.name:8} {c.get_status_display():12} học viên {c.n:3} | "
                f"được học {c.access:3} | "
                f"phải thu {c.receivable or 0:>12,} | đã thu {c.paid or 0:>12,}".replace(",", ".")
            )
        check(not external.filter(is_published=True).exists(), "lớp cũ không hiện trên website")
        check(not external.exclude(course__slug__in=(RB, EB)).exists(), "lớp cũ đều thuộc khóa RB / EB")
        wrong_code = [
            c.code
            for c in external
            if c.code != f"{'RB' if c.course.slug == RB else 'EB'}-K{c.name.split()[-1]}"
        ]
        check(not wrong_code, "mã lớp khớp tên lớp và khóa", wrong_code)
        check(
            not external.filter(status__in=Cohort.JOINABLE).exists(), "lớp cũ không ở trạng thái nhận đăng ký"
        )
        in_ext = Order.objects.filter(cohort__external_lms=True)
        not_studying = in_ext.filter(learning_access=False)
        check(
            not not_studying.exists(),
            "học viên trong lớp cũ đều được tính là đã học (đóng đủ hoặc đóng đợt 1)",
            not_studying.values_list("order_code", flat=True),
        )
        check(
            not in_ext.exclude(crm_status="5. Đã đóng phí").exists(),
            "học viên trong lớp cũ ở giai đoạn Đã đóng phí",
            in_ext.exclude(crm_status="5. Đã đóng phí").values_list("order_code", flat=True),
        )
        check(
            not in_ext.filter(status__in=("cancelled", "refunded")).exists(),
            "không có đơn hủy / hoàn tiền nằm trong lớp",
        )
        bad_training = in_ext.exclude(
            Q(cohort__status="completed", training_status="Hoàn thành")
            | Q(cohort__status="in_progress", training_status="Đang học")
        )
        check(
            not bad_training.exists(),
            "trạng thái đào tạo khớp trạng thái lớp",
            bad_training.values_list("order_code", flat=True),
        )
        foreign = in_ext.exclude(attribution__has_key="legacy_code")
        check(
            not foreign.exists(),
            "lớp cũ chỉ có học viên nhập từ CRM cũ",
            foreign.values_list("order_code", flat=True),
        )

        # ---- money
        out("== Học phí")
        paid_short = legacy.filter(status="paid").exclude(total_paid_amount__gte=models_f("total_receivable"))
        out(
            f"   đơn 'đã thanh toán' mà số đã thu < phải thu (CRM cũ ghi đã đóng đủ): {paid_short.count()}"
            + (
                f" — {', '.join(paid_short.values_list('order_code', flat=True)[:15])}"
                if paid_short.exists()
                else ""
            )
        )
        mismatch = [
            o.order_code
            for o in legacy.annotate(s=Sum("payments__amount"))
            if (o.s or 0) != o.total_paid_amount
        ]
        check(not mismatch, "tổng đã thu khớp các khoản thanh toán ghi nhận", mismatch)
        payments = Payment.objects.filter(order__in=legacy)
        out(
            f"   thanh toán ghi nhận: {payments.count()} khoản, {_vnd(payments.aggregate(s=Sum('amount'))['s'])}"  # noqa: E501
        )
        refunds = Refund.objects.filter(order__in=legacy)
        out(f"   hoàn tiền: {refunds.count()} khoản, {_vnd(refunds.aggregate(s=Sum('amount'))['s'])}")
        check(
            not legacy.filter(status="refunded").exclude(refunds__isnull=False).exists(),
            "đơn 'đã hoàn tiền' có khoản hoàn",
        )
        open_inst = Installment.objects.filter(order__in=legacy, paid_at__isnull=True)
        stray = open_inst.exclude(order__cohort__external_lms=True)
        check(
            not stray.exists(),
            "đợt học phí chưa đóng chỉ có ở học viên trong lớp cũ (không bị nhắc phí)",
            stray.values_list("order__order_code", flat=True),
        )
        out(f"   đợt học phí còn nợ (lớp cũ, không nhắc tự động): {open_inst.count()}")

        # ---- nothing sent, nothing queued
        out("== Không gửi gì, không ghi danh Moodle")
        since = legacy.order_by("updated_at").values_list("updated_at", flat=True).first() or timezone.now()
        emails = set(legacy.exclude(customer_email="").values_list("customer_email", flat=True))
        all_sent = EmailLog.objects.filter(
            Q(order__in=legacy) | Q(recipient_email__in=emails), created_at__gte=since
        )
        # The known incident: the enrolment sweep's access e-mails of 02/11/2026 15:30–16:05 (fixed by
        # c120098f9 / e9845a24a, Moodle side removed); anything later is a new problem.
        incident_end = timezone.make_aware(timezone.datetime(2026, 11, 2, 16, 10))
        incident = all_sent.filter(template_code="lms_access", created_at__lt=incident_end)
        if incident.exists():
            out(f"   sự cố đã xử lý 02/11/2026: {incident.count()} email lms_access (không thu hồi được)")
        sent = all_sent.exclude(pk__in=incident.values("pk"))
        check(
            not sent.exists(),
            "không có email nào gửi tới học viên cũ kể từ khi nhập (ngoài sự cố đã xử lý)",
            [f"{e.template_code}" for e in sent[:10]],
        )
        # Skipped (taught elsewhere) or waiting for a class, and nothing left on Moodle.
        enrolled = LmsEnrollment.objects.filter(order__in=legacy).exclude(
            status__in=("waiting", "skipped"), moodle_course_id__isnull=True
        )
        check(
            not enrolled.exists(),
            "không học viên cũ nào được ghi danh Moodle",
            enrolled.values_list("order__order_code", flat=True),
        )
        if enrolled.exists() or sent.exists():  # what happened, to put it right
            local = timezone.localtime
            out("   ghi danh LMS (trạng thái | lớp | tạo TK | khóa Moodle | giờ tạo → ghi danh):")
            rows = Counter(
                (
                    e.status,
                    e.order.cohort.code if e.order.cohort else "-",
                    e.user_created,
                    e.moodle_course_id,
                    f"{local(e.created_at):%d/%m %H:%M}",
                    f"{local(e.enrolled_at):%d/%m %H:%M}" if e.enrolled_at else "-",
                )
                for e in enrolled.select_related("order__cohort")
            )
            for key, count in sorted(rows.items(), key=lambda kv: kv[0][4]):
                out(f"     {count:3} × {' | '.join(str(k) for k in key)}")
            out("   chi tiết email (mẫu | trạng thái | người gửi | giờ):")
            mails = Counter(
                (
                    m.template_code,
                    m.status,
                    "nhân viên" if m.sent_by_id else "hệ thống",
                    f"{local(m.created_at):%d/%m %H}h",
                )
                for m in sent
            )
            for key, count in sorted(mails.items(), key=lambda kv: kv[0][3]):
                out(f"     {count:3} × {' | '.join(key)}")
            from apps.core.models import AuditLog

            for log in AuditLog.objects.filter(at__gte=since, action__startswith="lms").order_by("at")[:20]:
                out(f"   log {local(log.at):%d/%m %H:%M} {log.action} {str(log.details)[:70]}")
            courses = sorted({e.moodle_course_id for e in enrolled if e.moodle_course_id})
            out(f"   khóa Moodle liên quan: {courses}")
        waiting = LmsEnrollment.objects.filter(order__in=legacy, status="waiting").count()
        out(f"   chờ xếp lớp trên LMS (đã đóng phí, chưa có lớp): {waiting}")
        check(
            not external.exclude(moodle_attendance_id__isnull=True).exists(),
            "lớp cũ không có hoạt động điểm danh Moodle",
        )
        for key in ("abandoned_checkout", "intake_starting", "not_started", "completed_next"):
            hits = journeys.candidates(key).filter(pk__in=legacy)
            check(
                not hits.exists(),
                f"hành trình email '{key}' không nhắm tới học viên cũ",
                hits.values_list("order_code", flat=True),
            )
        check(not overdue_leads().filter(pk__in=legacy).exists(), "không lead cũ nào bị báo trễ hạn phản hồi")
        check(
            not legacy.filter(escalated_at__isnull=True, status="pending").exists(),
            "lead cũ không vào email báo quản lý",
        )

        # ---- lists
        out("== Danh mục")
        off = Counter(v for v in legacy.values_list("source", flat=True) if v and v not in sources)
        check(not off, "nguồn theo danh mục", [f"{k} ({v})" for k, v in off.items()])
        off = Counter(
            v
            for v in Order.objects.values_list("interest_level", flat=True)
            if v and v not in interest_levels
        )
        check(not off, "mức độ quan tâm theo danh mục (mọi đăng ký)", [f"{k} ({v})" for k, v in off.items()])
        off = Counter(
            v
            for v in Order.objects.values_list("training_status", flat=True)
            if v and v not in training_statuses
        )
        check(
            not off, "trạng thái đào tạo theo danh mục (mọi đăng ký)", [f"{k} ({v})" for k, v in off.items()]
        )
        cancelled = legacy.filter(crm_status="7. Đã hủy")
        check(
            not cancelled.filter(lost_reason="").exists(),
            "đăng ký đã hủy đều có lý do",
            cancelled.filter(lost_reason="").values_list("order_code", flat=True),
        )
        check(
            not cancelled.filter(status="pending").exists(),
            "đăng ký đã hủy không còn ở trạng thái chờ thanh toán",
        )

        # ---- class 9
        out("== Khóa 9")
        for code in ("RB-K9", "EB-K9"):
            c = Cohort.objects.filter(code=code).select_related("course").first()
            if c is None:
                check(False, f"có lớp {code}")
                continue
            state, label = c.website_state()
            out(
                f"   {code}: {c.name} | {c.get_status_display()} | khai giảng {c.start_date} | "
                f"hạn {c.registration_deadline} | {label}"
            )
            check(
                c.name == "Khóa 9" and not c.external_lms and state == "live", f"{code} mở bán trên website"
            )
        check(
            not Cohort.objects.filter(code__in=("RB-K1", "EB-K1"), external_lms=False).exists(),
            "không còn lớp RB/EB 'Khóa 1' mới (đã đổi thành Khóa 9)",
        )

        out("")
        out(f"KẾT QUẢ: {len(problems)} lỗi" + ("" if not problems else ": " + "; ".join(problems)))


def _vnd(value) -> str:
    return f"{value or 0:,}đ".replace(",", ".")


def models_f(name):
    from django.db.models import F

    return F(name)
