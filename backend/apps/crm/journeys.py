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
    from apps.payments.billing import payment_instructions

    qr = payment_instructions(order)
    if qr is None:
        raise ValueError("no payment instructions")
    html = f"""
<p>Chào {escape(order.customer_name)},</p>
<p>Bạn đã đăng ký <strong>{escape(order.course_title)}</strong> nhưng TWings chưa nhận được học phí.
Chỗ học vẫn được giữ cho bạn – chỉ cần chuyển khoản theo thông tin dưới đây,
hệ thống tự xác nhận và mở khóa học.</p>
<p>Số tiền: <strong>{_vnd(qr["amount"])}</strong><br>
Ngân hàng: {escape(qr["bank_name"])}<br>
Số tài khoản: <strong>{escape(qr["account_number"])}</strong> – {escape(qr["account_name"])}<br>
Nội dung chuyển khoản: <strong>{escape(qr["transfer_content"])}</strong></p>
<p><img src="{qr["qr_image_url"]}" alt="VietQR" width="220"></p>
<p>Cần tư vấn thêm hoặc muốn trả góp? Trả lời email này, TWings sẽ liên hệ bạn.</p>
<p>TWings Academy</p>
"""
    return f"Hoàn tất đăng ký {order.course_title} – mã {order.order_code} | TWings Academy", html


def _intake_starting(order: Order) -> tuple[str, str]:
    cohort = order.cohort
    where = f"<br>Địa điểm: {escape(cohort.location)}" if cohort.location else ""
    html = f"""
<p>Chào {escape(order.customer_name)},</p>
<p>Lớp <strong>{escape(cohort.name)}</strong> của khóa <strong>{escape(order.course_title)}</strong>
khai giảng ngày <strong>{cohort.start_date.strftime("%d/%m/%Y")}</strong>.{where}</p>
<p>Học liệu, lịch học và bài tập có trên <a href="{_site()}/learn/">TWings LMS</a> – đăng nhập bằng nút
“Đăng nhập bằng TWings” với email {escape(order.customer_email)}.</p>
<p>Hẹn gặp bạn tại lớp!<br>TWings Academy</p>
"""
    return f"Sắp khai giảng {cohort.name} – {order.course_title} | TWings Academy", html


def _not_started(order: Order) -> tuple[str, str]:
    html = f"""
<p>Chào {escape(order.customer_name)},</p>
<p>Khóa <strong>{escape(order.course_title)}</strong> đã mở cho bạn được một tuần
nhưng bạn chưa bắt đầu bài học nào. Chỉ 20 phút mỗi ngày là đủ để theo kịp lộ trình.</p>
<p><a href="{_site()}/learn/">Vào học ngay trên TWings LMS</a> · Xem tiến độ tại
<a href="{_account()}">Học phí & hồ sơ</a></p>
<p>Gặp khó khăn khi đăng nhập hay sắp xếp thời gian? Trả lời email này để được hỗ trợ.</p>
<p>TWings Academy</p>
"""
    return f"Bắt đầu khóa {order.course_title} ngay hôm nay | TWings Academy", html


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
    enrollment = order.lms_enrollment
    certificate = getattr(enrollment, "certificate", None)
    cert = (
        f'<p>Chứng chỉ của bạn: <a href="{_site()}/xac-minh/{certificate.code}/">{certificate.code}</a></p>'
        if certificate and not certificate.revoked
        else ""
    )
    items = _suggestions(order)
    suggestions = "".join(f'<li><a href="{url}">{escape(title)}</a></li>' for title, url in items)
    next_steps = f"<p>Gợi ý học tiếp:</p><ul>{suggestions}</ul>" if suggestions else ""
    html = f"""
<p>Chào {escape(order.customer_name)},</p>
<p>Chúc mừng bạn đã hoàn thành <strong>{escape(order.course_title)}</strong>!</p>
{cert}
<p>Cảm nhận của bạn giúp TWings dạy tốt hơn và giúp người đến sau chọn đúng khóa học:
<a href="{_account()}">viết đánh giá trong cổng học viên (Học phí & hồ sơ)</a>
(vài phút, chỉ đăng lên website khi bạn đồng ý).</p>
{next_steps}
<p>TWings Academy</p>
"""
    return f"Chúc mừng bạn hoàn thành {order.course_title} | TWings Academy", html


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
