"""
Journey steps 9-10 – from graduate to employee (partner bank, MSB by default):

9. Referral: graduates with a valid certificate are shortlisted, their file is sent to the bank
   (a time-limited link where the bank's HR sees the candidates – course, grade, attendance, verified
   certificate, CV – and records interview / offer / start / rejection themselves), interview
   invitations and the job offer are e-mailed to the learner.
10. After the start: follow-up tasks (first week, 30 days, end of probation, 6 months, end of the job
    guarantee), probation result, leaving within the guarantee -> back on the referral list. Outcome
    report: placement rate per course and hires against the campaign quotas.
"""

import hashlib
import logging
import secrets
from datetime import date, timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.html import escape

from .models import Activity, CampaignPosition, FollowupTask, Order, PartnerShare, Placement

logger = logging.getLogger(__name__)

STAGE_LABEL = dict(Placement.STAGE_CHOICES)
OPEN_STAGES = ("shortlisted", "submitted", "interview", "offer")
CLOSED_STAGES = ("rejected", "withdrawn")
TRANSITIONS = {
    "shortlisted": {"submitted", "interview", "rejected", "withdrawn"},
    "submitted": {"interview", "offer", "rejected", "withdrawn"},
    "interview": {"interview", "offer", "rejected", "withdrawn"},  # interview -> interview = next round
    "offer": {"hired", "rejected", "withdrawn"},
    "hired": set(),
    "rejected": {"shortlisted"},
    "withdrawn": {"shortlisted"},
}
PROBATION_DAYS = 60
GUARANTEE_MONTHS = 12
SHARE_DAYS = 30


class PlacementError(ValueError):
    pass


# ---------------------------------------------------------------- serialisation
def placement_data(p: Placement) -> dict:
    order = p.order
    enrollment = getattr(order, "lms_enrollment", None)
    certificate = getattr(enrollment, "certificate", None) if enrollment else None
    return {
        "id": p.id,
        "order_id": order.id,
        "order_code": order.order_code,
        "name": order.customer_name,
        "phone": order.customer_phone,
        "email": order.customer_email,
        "course": order.course_title,
        "position_id": p.position_id,
        "position": p.position.position_title if p.position_id else "",
        "employer": p.employer,
        "unit": p.unit,
        "job_title": p.job_title,
        "stage": p.stage,
        "stage_label": STAGE_LABEL[p.stage],
        "interview_at": p.interview_at.isoformat() if p.interview_at else None,
        "interview_location": p.interview_location,
        "feedback": p.feedback,
        "offer_salary": p.offer_salary,
        "start_date": p.start_date.isoformat() if p.start_date else None,
        "probation_end": p.probation_end.isoformat() if p.probation_end else None,
        "probation_result": p.probation_result,
        "guarantee_until": p.guarantee_until.isoformat() if p.guarantee_until else None,
        "left_at": p.left_at.isoformat() if p.left_at else None,
        "left_reason": p.left_reason,
        "rejection_reason": p.rejection_reason,
        "staff": (p.staff.name or p.staff.email) if p.staff_id else "",
        "certificate_code": certificate.code if certificate and not certificate.revoked else "",
        "grade_percent": enrollment.grade_percent if enrollment else None,
        "attendance_rate": enrollment.attendance_rate if enrollment else None,
        "has_cv": order.cv_link.startswith("private:"),
        "created_at": p.created_at.isoformat(),
        "updated_at": p.updated_at.isoformat(),
    }


def placements_qs():
    return Placement.objects.select_related(
        "order", "order__lms_enrollment", "order__lms_enrollment__certificate", "position", "staff"
    )


# ---------------------------------------------------------------- candidates
def _graduates():
    return Order.objects.filter(
        lms_enrollment__certificate__isnull=False, lms_enrollment__certificate__revoked=False
    ).select_related("course", "cohort", "lms_enrollment", "lms_enrollment__certificate")


def needs_new_referral(p: Placement) -> bool:
    """Hired, then failed probation or left while the job guarantee still ran."""
    if p.stage != "hired":
        return False
    ended = p.probation_result == "failed" or p.left_at is not None
    within = p.guarantee_until is None or (p.left_at or timezone.localdate()) <= p.guarantee_until
    return ended and within


def candidates() -> list[dict]:
    """Graduates with no open referral and no job (or who lost it within the guarantee)."""
    graduates = list(_graduates())
    by_order: dict[str, list[Placement]] = {}
    for p in Placement.objects.filter(order__in=graduates):
        by_order.setdefault(p.order_id, []).append(p)
    positions: dict[str, list[CampaignPosition]] = {}
    for pos in CampaignPosition.objects.filter(campaign__status__in=("active", "planning")).select_related(
        "campaign"
    ):
        positions.setdefault(pos.course_id, []).append(pos)
    rows = []
    for order in graduates:
        mine = by_order.get(order.id, [])
        if any(p.stage in OPEN_STAGES for p in mine):
            continue
        hired = [p for p in mine if p.stage == "hired"]
        if hired and not any(needs_new_referral(p) for p in hired):
            continue
        enrollment = order.lms_enrollment
        rows.append(
            {
                "order_id": order.id,
                "name": order.customer_name,
                "phone": order.customer_phone,
                "email": order.customer_email,
                "course": order.course_title,
                "cohort": order.cohort.name if order.cohort_id else "",
                "graduated_at": enrollment.certificate.issued_at.date().isoformat(),
                "grade_percent": enrollment.grade_percent,
                "attendance_rate": enrollment.attendance_rate,
                "has_cv": order.cv_link.startswith("private:"),
                "previous": [f"{p.employer} – {STAGE_LABEL[p.stage]}" for p in mine],
                "rereferral": bool(hired),
                "positions": [
                    {"id": pos.id, "title": pos.position_title, "campaign": pos.campaign.name}
                    for pos in positions.get(order.course_id, [])
                ],
            }
        )
    rows.sort(key=lambda r: (not r["rereferral"], r["graduated_at"]))
    return rows


# ---------------------------------------------------------------- lifecycle
def _actor(user, name: str = "") -> tuple[str, object]:
    if user is not None:
        return user.name or user.email, user
    return name or "Hệ thống", None


def _log(p: Placement, title: str, content: str, user=None, actor_name: str = "") -> None:
    actor, actor_user = _actor(user, actor_name)
    Activity.objects.create(
        order=p.order, type="note", title=title, content=content[:2000], actor=actor, actor_user=actor_user
    )


def sync_order(order: Order) -> None:
    """Keep the order's legacy placement fields (CRM list, exports, reports) in line."""
    latest = order.placements.exclude(stage__in=CLOSED_STAGES).order_by("-updated_at").first()
    latest = latest or order.placements.order_by("-updated_at").first()
    if latest is None:
        return
    order.placement_company = " – ".join(x for x in (latest.employer, latest.unit) if x)[:200]
    order.placement_status = STAGE_LABEL[latest.stage]
    if latest.stage == "hired" and latest.left_at:
        order.placement_status = "Đã nghỉ việc"
    order.work_start_date = latest.start_date if latest.stage == "hired" else None
    order.guarantee_start_date = (
        latest.start_date if latest.stage == "hired" and latest.guarantee_until else None
    )
    order.save(
        update_fields=[
            "placement_company",
            "placement_status",
            "work_start_date",
            "guarantee_start_date",
            "updated_at",
        ]
    )


def refer(order: Order, user, *, position: CampaignPosition | None = None, **fields) -> Placement:
    enrollment = getattr(order, "lms_enrollment", None)
    certificate = getattr(enrollment, "certificate", None) if enrollment else None
    if certificate is None or certificate.revoked:
        raise PlacementError("Học viên chưa tốt nghiệp (chưa có chứng chỉ hợp lệ).")
    if order.placements.filter(stage__in=OPEN_STAGES).exists():
        raise PlacementError("Học viên đang có một hồ sơ giới thiệu chưa kết thúc.")
    p = Placement.objects.create(
        order=order,
        position=position,
        employer=(fields.get("employer") or "MSB")[:200],
        unit=(fields.get("unit") or (position.department if position else ""))[:200],
        job_title=(fields.get("job_title") or (position.position_title if position else ""))[:200],
        staff=user,
    )
    _log(p, f"Đề cử việc làm: {p.employer}", " – ".join(x for x in (p.job_title, p.unit) if x), user)
    sync_order(order)
    return p


def _add_months(d: date, months: int) -> date:
    y, m = divmod(d.month - 1 + months, 12)
    year, month = d.year + y, m + 1
    for day in (d.day, 30, 29, 28):
        try:
            return date(year, month, day)
        except ValueError:
            continue
    return d


@transaction.atomic
def move(
    p: Placement,
    stage: str,
    *,
    user=None,
    actor_name: str = "",
    notify: bool = True,
    interview_at=None,
    interview_location: str = "",
    start_date: date | None = None,
    offer_salary: str = "",
    reason: str = "",
    note: str = "",
) -> Placement:
    if stage not in STAGE_LABEL:
        raise PlacementError("Bước không hợp lệ.")
    if stage not in TRANSITIONS[p.stage]:
        raise PlacementError(f"Không chuyển được từ “{STAGE_LABEL[p.stage]}” sang “{STAGE_LABEL[stage]}”.")
    now = timezone.now()
    if stage == "interview":
        if not interview_at:
            raise PlacementError("Nhập thời gian phỏng vấn.")
        p.interview_at, p.interview_location = interview_at, interview_location[:300]
    if stage == "submitted":
        p.submitted_at = now
    if stage == "offer" and offer_salary:
        p.offer_salary = offer_salary[:100]
    if stage == "hired":
        if not start_date:
            raise PlacementError("Nhập ngày bắt đầu làm việc.")
        p.start_date = start_date
        p.probation_end = start_date + timedelta(days=PROBATION_DAYS)
        p.guarantee_until = _add_months(start_date, GUARANTEE_MONTHS)
        p.decided_at = now
    if stage in CLOSED_STAGES:
        if not reason:
            raise PlacementError("Nhập lý do.")
        p.rejection_reason, p.decided_at = reason[:300], now
    if stage == "shortlisted":  # reopened
        p.rejection_reason, p.decided_at = "", None
    if note:
        p.feedback = note[:2000]
    previous = p.stage
    p.stage = stage
    p.save()
    detail = {
        "interview": lambda: (
            f"Lịch: {timezone.localtime(p.interview_at):%H:%M %d/%m/%Y} – {p.interview_location}"
        ),
        "hired": lambda: f"Bắt đầu {p.start_date:%d/%m/%Y}, thử việc đến {p.probation_end:%d/%m/%Y}",
        "rejected": lambda: f"Lý do: {p.rejection_reason}",
        "withdrawn": lambda: f"Lý do: {p.rejection_reason}",
    }.get(stage, lambda: "")()
    _log(
        p,
        f"Việc làm {p.employer}: {STAGE_LABEL[previous]} → {STAGE_LABEL[stage]}",
        "\n".join(x for x in (detail, note) if x),
        user,
        actor_name,
    )
    if stage == "hired":
        _schedule_followups(p)
    sync_order(p.order)
    if notify and stage in ("interview", "offer", "hired"):
        transaction.on_commit(lambda: notify_learner(p.pk))
    return p


def _schedule_followups(p: Placement) -> None:
    """Step 10: check-ins after the start, the probation review and the end of the job guarantee."""
    owner = (p.staff.name or p.staff.email)[:100] if p.staff_id else ""
    start = p.start_date
    plan = [
        (start + timedelta(days=7), "Việc làm: hỏi thăm tuần đầu đi làm", "medium"),
        (start + timedelta(days=30), "Việc làm: hỏi thăm sau 30 ngày", "medium"),
        (p.probation_end, "Việc làm: cập nhật kết quả thử việc", "high"),
        (start + timedelta(days=182), "Việc làm: hỏi thăm sau 6 tháng", "low"),
        (p.guarantee_until, "Việc làm: kết thúc thời gian cam kết việc làm", "low"),
    ]
    FollowupTask.objects.bulk_create(
        FollowupTask(
            order=p.order, title=f"{title} ({p.employer})", due_date=due, priority=prio, assigned_to=owner
        )
        for due, title, prio in plan
        if due
    )


def record_outcome(
    p: Placement,
    *,
    user,
    probation_result: str | None = None,
    left_at: date | None = None,
    left_reason: str = "",
) -> Placement:
    """After the start: probation result and/or leaving the job."""
    if p.stage != "hired":
        raise PlacementError("Chỉ cập nhật sau khi ứng viên đã nhận việc.")
    changes = []
    if probation_result is not None and probation_result != p.probation_result:
        if probation_result not in dict(Placement.PROBATION_CHOICES):
            raise PlacementError("Kết quả thử việc không hợp lệ.")
        p.probation_result = probation_result
        changes.append(dict(Placement.PROBATION_CHOICES)[probation_result])
    if left_at is not None and left_at != p.left_at:
        if not left_reason:
            raise PlacementError("Nhập lý do nghỉ việc.")
        p.left_at, p.left_reason = left_at, left_reason[:300]
        changes.append(f"Nghỉ việc từ {left_at:%d/%m/%Y}: {p.left_reason}")
    if not changes:
        return p
    p.save()
    if needs_new_referral(p):
        changes.append("Trong thời gian cam kết việc làm → đưa lại vào danh sách giới thiệu")
        FollowupTask.objects.create(
            order=p.order,
            title="Việc làm: giới thiệu lại (cam kết việc làm)",
            due_date=timezone.localdate() + timedelta(days=7),
            priority="high",
            assigned_to=(p.staff.name or p.staff.email)[:100] if p.staff_id else "",
        )
    _log(p, f"Sau tuyển dụng – {p.employer}", "\n".join(changes), user)
    sync_order(p.order)
    return p


# ---------------------------------------------------------------- e-mails to the learner
def notify_learner(placement_id: str) -> bool:
    from apps.notifications.outbox import send_logged
    from apps.notifications.resend import ResendError

    p = Placement.objects.select_related("order").filter(pk=placement_id).first()
    if p is None or not p.order.customer_email:
        return False
    name = escape(p.order.customer_name)
    role = escape(" – ".join(x for x in (p.job_title, p.unit) if x) or p.employer)
    if p.stage == "interview":
        subject = f"Lịch phỏng vấn tại {p.employer}"
        body = (
            f"<p>Hồ sơ của bạn đã được {escape(p.employer)} chọn phỏng vấn cho vị trí "
            f"<strong>{role}</strong>.</p>"
            f"<p><strong>Thời gian:</strong> {timezone.localtime(p.interview_at):%H:%M ngày %d/%m/%Y}<br>"
            f"<strong>Địa điểm / link:</strong> {escape(p.interview_location or 'TWings sẽ báo sau')}</p>"
            "<p>Vui lòng phản hồi email này để xác nhận tham gia. Chúc bạn phỏng vấn thành công!</p>"
        )
    elif p.stage == "offer":
        subject = f"Chúc mừng – {p.employer} gửi đề nghị làm việc"
        body = (
            f"<p>Chúc mừng bạn đã vượt qua vòng phỏng vấn vị trí <strong>{role}</strong> tại "
            f"{escape(p.employer)}. Bộ phận tuyển dụng sẽ liên hệ để thống nhất thư mời nhận việc.</p>"
        )
    elif p.stage == "hired":
        subject = f"Chúc mừng bạn chính thức gia nhập {p.employer}"
        body = (
            f"<p>Chúc mừng bạn nhận việc vị trí <strong>{role}</strong> tại {escape(p.employer)}, "
            f"ngày bắt đầu {p.start_date:%d/%m/%Y}.</p>"
            "<p>TWings sẽ đồng hành cùng bạn trong thời gian thử việc – "
            "có khó khăn gì hãy phản hồi email này.</p>"
        )
    else:
        return False
    try:
        send_logged(
            to=p.order.customer_email,
            subject=subject,
            html=f"<p>Chào {name},</p>{body}<p>TWings Academy</p>",
            order=p.order,
            template_code=f"placement_{p.stage}",
            name=p.order.customer_name,
        )
    except ResendError:
        logger.warning("Placement e-mail for %s not sent", p.order.order_code)
        return False
    return True


# ---------------------------------------------------------------- partner link
def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_share(
    placements: list[Placement], user, *, title: str, employer: str = "MSB", allow_cv=True, days=SHARE_DAYS
):
    """Returns (share, token): the token is shown once, only its hash is stored."""
    if not placements:
        raise PlacementError("Chọn ít nhất một ứng viên.")
    token = secrets.token_urlsafe(32)
    share = PartnerShare.objects.create(
        token_hash=_hash(token),
        employer=employer[:200] or "MSB",
        title=title[:200],
        allow_cv=allow_cv,
        expires_at=timezone.now() + timedelta(days=max(1, min(days, 90))),
        created_by=user,
    )
    share.placements.set(placements)
    for p in placements:
        if p.stage == "shortlisted":
            move(p, "submitted", user=user, notify=False, note=f"Gửi đối tác qua link “{share.title}”")
    return share, token


def share_url(token: str) -> str:
    from apps.cms.seo import base_url

    return f"{base_url()}/doi-tac/{token}/"


def resolve_share(token: str) -> PartnerShare | None:
    share = PartnerShare.objects.filter(token_hash=_hash(token or "")).first()
    return share if share and share.active else None


def share_data(s: PartnerShare) -> dict:
    return {
        "id": s.id,
        "title": s.title,
        "employer": s.employer,
        "allow_cv": s.allow_cv,
        "expires_at": s.expires_at.isoformat(),
        "active": s.active,
        "revoked": s.revoked_at is not None,
        "candidates": s.placements.count(),
        "view_count": s.view_count,
        "last_viewed_at": s.last_viewed_at.isoformat() if s.last_viewed_at else None,
        "created_by": (s.created_by.name or s.created_by.email) if s.created_by_id else "",
        "created_at": s.created_at.isoformat(),
    }


# ---------------------------------------------------------------- learner account
def learner_items(orders) -> list[dict]:
    rows = Placement.objects.filter(order__in=orders).exclude(stage="shortlisted").order_by("-created_at")
    return [
        {
            "employer": p.employer,
            "role": " – ".join(x for x in (p.job_title, p.unit) if x),
            "stage": p.stage,
            "stage_label": "Đã nghỉ việc" if p.left_at else STAGE_LABEL[p.stage],
            "interview_at": p.interview_at.isoformat() if p.interview_at and p.stage == "interview" else None,
            "interview_location": p.interview_location if p.stage == "interview" else "",
            "start_date": p.start_date.isoformat() if p.start_date else None,
        }
        for p in rows
    ]


# ---------------------------------------------------------------- step 10 report
def outcomes() -> dict:
    today = timezone.localdate()
    graduates = list(_graduates())
    placements = list(Placement.objects.select_related("order", "position", "position__campaign"))
    by_order: dict[str, list[Placement]] = {}
    for p in placements:
        by_order.setdefault(p.order_id, []).append(p)
    courses: dict[str, dict] = {}
    for order in graduates:
        row = courses.setdefault(
            order.course_title or "Khác",
            {
                "course": order.course_title or "Khác",
                "graduates": 0,
                "referred": 0,
                "interviewed": 0,
                "hired": 0,
                "passed_probation": 0,
                "working": 0,
                "days_to_job": [],
            },
        )
        row["graduates"] += 1
        mine = by_order.get(order.id, [])
        row["referred"] += bool(mine)
        row["interviewed"] += any(p.interview_at for p in mine)
        hired = [p for p in mine if p.stage == "hired"]
        if hired:
            row["hired"] += 1
            row["passed_probation"] += any(p.probation_result == "passed" for p in hired)
            row["working"] += any(not p.left_at for p in hired)
            first = min(hired, key=lambda p: p.start_date)
            issued = order.lms_enrollment.certificate.issued_at.date()
            row["days_to_job"].append(max((first.start_date - issued).days, 0))
    rows = []
    for row in sorted(courses.values(), key=lambda r: -r["graduates"]):
        days = row.pop("days_to_job")
        row["placement_rate"] = round(100 * row["hired"] / row["graduates"]) if row["graduates"] else 0
        row["avg_days_to_job"] = round(sum(days) / len(days)) if days else None
        rows.append(row)
    quotas = []
    for pos in CampaignPosition.objects.select_related("campaign").order_by("campaign__code", "short_name"):
        mine = [p for p in placements if p.position_id == pos.id]
        quotas.append(
            {
                "campaign": pos.campaign.name,
                "position": pos.position_title,
                "target": pos.target_quota,
                "in_process": sum(p.stage in OPEN_STAGES for p in mine),
                "hired": sum(p.stage == "hired" for p in mine),
            }
        )
    hired = [p for p in placements if p.stage == "hired"]
    return {
        "courses": rows,
        "quotas": quotas,
        "funnel": {stage: sum(p.stage == stage for p in placements) for stage, _ in Placement.STAGE_CHOICES},
        "probation_due": [
            placement_brief(p)
            for p in hired
            if p.probation_end and p.probation_end <= today and not p.probation_result
        ],
        "guarantee_ending": [
            placement_brief(p)
            for p in hired
            if p.guarantee_until
            and today <= p.guarantee_until <= today + timedelta(days=30)
            and not p.left_at
        ],
        "rereferral": [placement_brief(p) for p in hired if needs_new_referral(p)],
    }


def placement_brief(p: Placement) -> dict:
    return {
        "id": p.id,
        "order_id": p.order_id,
        "name": p.order.customer_name,
        "employer": p.employer,
        "unit": p.unit,
        "start_date": p.start_date.isoformat() if p.start_date else None,
        "probation_end": p.probation_end.isoformat() if p.probation_end else None,
        "guarantee_until": p.guarantee_until.isoformat() if p.guarantee_until else None,
    }


def search_filter(qs, q: str):
    q = (q or "").strip()
    if not q:
        return qs
    return qs.filter(
        Q(order__customer_name__icontains=q)
        | Q(order__order_code__iexact=q)
        | Q(employer__icontains=q)
        | Q(unit__icontains=q)
    )
