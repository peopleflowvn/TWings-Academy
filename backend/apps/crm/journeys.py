"""
Automated learner-journey e-mails, run by `run_journeys` (cron, daily):

  abandoned_checkout  registered with VietQR but never paid (1-7 days) -> finish payment, with the QR
  intake_starting     enrolled in an intake starting within 3 days     -> date, place, how to sign in
  not_started         enrolled 7+ days ago, still 0% progress          -> nudge to start
  completed_next      completed 2+ days ago                            -> certificate + what to learn next

Each journey e-mails an order at most once: the EmailLog (template_code "journey_<key>") is the marker,
so a failed send is retried next run. Staff switch journeys on/off in /app (SiteConfig "journeys").
"""

import logging
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from django.utils.html import escape

from apps.core.models import SiteConfig
from apps.notifications.models import EmailLog
from apps.notifications.outbox import send_logged
from apps.notifications.resend import ResendError

from .models import Activity, Order

logger = logging.getLogger(__name__)

JOURNEYS = {
    "abandoned_checkout": {
        "label": "Nhắc hoàn tất thanh toán",
        "description": (
            "Đăng ký thanh toán VietQR nhưng chưa chuyển khoản sau 1 ngày: gửi lại mã QR (một lần)."
        ),
    },
    "intake_starting": {
        "label": "Sắp khai giảng",
        "description": "3 ngày trước ngày khai giảng của đợt: ngày học, địa điểm, cách vào TWings LMS.",
    },
    "not_started": {
        "label": "Nhắc bắt đầu học",
        "description": "Đã ghi danh 7 ngày (đợt đã khai giảng) mà tiến độ vẫn 0%: nhắc vào học.",
    },
    "completed_next": {
        "label": "Chúc mừng hoàn thành & gợi ý học tiếp",
        "description": (
            "2 ngày sau khi hoàn thành: link chứng chỉ, mời phản hồi và gợi ý khóa/chương trình tiếp theo."
        ),
    },
}
SENT_STATUSES = ("queued", "sent", "delivered", "opened", "clicked", "simulated")
MAX_PER_RUN = 200


def settings_doc() -> dict:
    doc = SiteConfig.objects.filter(key=SiteConfig.KEY_JOURNEYS).first()
    return doc.data if doc else {}


def is_enabled(key: str) -> bool:
    return bool(settings_doc().get(key, {}).get("enabled", True))


def set_enabled(key: str, enabled: bool) -> None:
    doc, _ = SiteConfig.objects.get_or_create(key=SiteConfig.KEY_JOURNEYS)
    doc.data = {**doc.data, key: {**doc.data.get(key, {}), "enabled": enabled}}
    doc.save()


def template_code(key: str) -> str:
    return f"journey_{key}"


def _not_sent(orders, key: str):
    sent = EmailLog.objects.filter(template_code=template_code(key), status__in=SENT_STATUSES)
    return orders.exclude(pk__in=sent.values("order_id"))


def _account():
    from apps.lms.emails import account_url

    return account_url()


def _site():
    from apps.lms.emails import site_url

    return site_url()


def _vnd(value: int) -> str:
    return f"{value:,}đ".replace(",", ".")


# ---------------------------------------------------------------- candidates
def candidates(key: str, now=None):
    now = now or timezone.now()
    today = timezone.localdate(now)
    base = Order.objects.exclude(customer_email="")
    if key == "abandoned_checkout":
        qs = base.filter(
            parent__isnull=True,
            status="pending",
            payment_method="vietqr",
            total_paid_amount=0,
            amount__gt=0,
            created_at__lte=now - timedelta(days=1),
            created_at__gte=now - timedelta(days=7),
            # Checkouts holding a seat get the confirmation and the hold reminder instead.
            hold_expires_at__isnull=True,
        )
    elif key == "intake_starting":
        qs = base.filter(
            lms_enrollment__status="done",
            cohort__start_date__gte=today,
            cohort__start_date__lte=today + timedelta(days=3),
        )
    elif key == "not_started":
        qs = base.filter(
            lms_enrollment__status="done",
            lms_enrollment__enrolled_at__lte=now - timedelta(days=7),
            lms_enrollment__completed_at__isnull=True,
        ).filter(Q(lms_enrollment__progress__isnull=True) | Q(lms_enrollment__progress=0))
        no_date = Q(cohort__isnull=True) | Q(cohort__start_date__isnull=True)
        started = no_date | Q(cohort__start_date__lte=today)
        qs = qs.filter(started)
    elif key == "completed_next":
        qs = base.filter(
            lms_enrollment__completed_at__lte=now - timedelta(days=2),
            lms_enrollment__completed_at__gte=now - timedelta(days=30),
        ).exclude(status__in=("refunded", "cancelled"))
    else:
        raise KeyError(key)
    return _not_sent(qs, key).select_related("cohort", "course").distinct()


# ---------------------------------------------------------------- content
def _abandoned(order: Order) -> tuple[str, str]:
    from apps.notifications.components import payment_block
    from apps.notifications.engine import render_template
    from apps.payments.billing import payment_instructions

    qr = payment_instructions(order)
    if qr is None:
        raise ValueError("no payment instructions")
    return render_template(
        "journey_abandoned_checkout",
        context={
            "customer_name": escape(order.customer_name),
            "course_title": escape(order.course_title),
            "order_code": escape(order.order_code),
            "amount": _vnd(qr["amount"]),
            "payment_details": payment_block(qr),
        },
    )


def _intake_starting(order: Order) -> tuple[str, str]:
    from apps.lms.emails import class_details
    from apps.notifications.engine import render_template

    cohort = order.cohort
    return render_template(
        "journey_intake_starting",
        context={
            "customer_name": escape(order.customer_name),
            "cohort_name": escape(cohort.name),
            "course_title": escape(order.course_title),
            "start_date": cohort.start_date.strftime("%d/%m/%Y"),
            "class_details": class_details(cohort, with_start=False),
            "customer_email": escape(order.customer_email),
            "lms_url": f"{_site()}/learn/",
        },
    )


def _not_started(order: Order) -> tuple[str, str]:
    from apps.notifications.engine import render_template

    return render_template(
        "journey_not_started",
        context={
            "customer_name": escape(order.customer_name),
            "course_title": escape(order.course_title),
            "lms_url": f"{_site()}/learn/",
            "account_url": _account(),
        },
    )


def _suggestions(order: Order) -> list[tuple[str, str]]:
    from apps.catalog.models import Course, Program

    owned = Order.objects.filter(customer_email__iexact=order.customer_email, learning_access=True)
    owned_courses = set(owned.exclude(course__isnull=True).values_list("course_id", flat=True))
    owned_programs = set(owned.exclude(program__isnull=True).values_list("program_id", flat=True))
    site = _site()
    items = [
        (p.title, f"{site}/chuong-trinh/{p.slug}")
        for p in Program.objects.filter(is_published=True)
        .exclude(pk__in=owned_programs)
        .exclude(program_courses__course_id__in=owned_courses)[:2]
    ]
    category = order.course.category if order.course_id else ""
    items += [
        (c.title, f"{site}/")
        for c in Course.objects.filter(is_published=True, category=category).exclude(pk__in=owned_courses)[:3]
    ]
    return items[:3]


def _completed_next(order: Order) -> tuple[str, str]:
    from apps.notifications.components import button
    from apps.notifications.engine import render_template

    enrollment = order.lms_enrollment
    certificate = getattr(enrollment, "certificate", None)
    cert = (
        f"<p>Chứng chỉ của bạn (mã <strong>{escape(certificate.code)}</strong>) đã được cấp:</p>"
        + button(f"{_site()}/xac-minh/{certificate.code}/", "Xem chứng chỉ")
        if certificate and not certificate.revoked
        else ""
    )
    items = _suggestions(order)
    suggestions = "".join(
        f'<li style="margin-bottom:4px;"><a href="{url}">{escape(title)}</a></li>' for title, url in items
    )
    next_steps = (
        "<p><strong>Gợi ý học tiếp:</strong></p>"
        f'<ul style="margin:0 0 14px 0;padding-left:20px;">{suggestions}</ul>'
        if suggestions
        else ""
    )
    return render_template(
        "journey_completed_next",
        context={
            "customer_name": escape(order.customer_name),
            "course_title": escape(order.course_title),
            "certificate_code": escape(certificate.code) if certificate and not certificate.revoked else "",
            "certificate_url": f"{_site()}/xac-minh/{certificate.code}/" if certificate else "",
            "account_url": _account(),
            "suggestions": f'<ul style="margin:0 0 14px 0;padding-left:20px;">{suggestions}</ul>'
            if suggestions
            else "",
            # Old variables, for templates edited before {{#if}} existed.
            "certificate_block": cert,
            "next_steps_block": next_steps,
        },
    )


CONTENT = {
    "abandoned_checkout": _abandoned,
    "intake_starting": _intake_starting,
    "not_started": _not_started,
    "completed_next": _completed_next,
}


# ---------------------------------------------------------------- run
def run(keys=None, now=None) -> dict:
    results = {}
    for key in keys or JOURNEYS:
        if not is_enabled(key):
            results[key] = "off"
            continue
        sent = failed = 0
        for order in candidates(key, now)[:MAX_PER_RUN]:
            try:
                subject, html = CONTENT[key](order)
                send_logged(
                    to=order.customer_email,
                    subject=subject,
                    html=html,
                    order=order,
                    template_code=template_code(key),
                    name=order.customer_name,
                )
            except (ResendError, ValueError):
                failed += 1
                logger.warning("Journey %s for order %s not sent", key, order.order_code)
                continue
            Activity.objects.create(
                order=order, type="email", title=f"Email tự động: {JOURNEYS[key]['label']}", actor="Hệ thống"
            )
            sent += 1
        results[key] = {"sent": sent, "failed": failed}
    return results


def overview(now=None) -> list[dict]:
    now = now or timezone.now()
    since = now - timedelta(days=30)
    rows = []
    for key, meta in JOURNEYS.items():
        logs = EmailLog.objects.filter(template_code=template_code(key))
        recent = logs.filter(created_at__gte=since)
        delivered = recent.filter(status__in=("delivered", "opened", "clicked")).count()
        opened = recent.filter(status__in=("opened", "clicked")).count()
        last = logs.order_by("-created_at").values_list("created_at", flat=True).first()
        rows.append(
            {
                "key": key,
                **meta,
                "enabled": is_enabled(key),
                "sent30d": recent.exclude(status="failed").count(),
                "delivered30d": delivered,
                "opened30d": opened,
                "failed30d": recent.filter(status="failed").count(),
                "lastSentAt": last,
                "waiting": candidates(key, now).count(),
            }
        )
    return rows
