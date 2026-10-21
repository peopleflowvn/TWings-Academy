"""
Attendance of corporate classes, session by session. Moodle (mod_attendance: teacher-taken or the
learner's own QR check-in) is the source; TWings keeps a copy of each mark (AttendanceRecord, synced
with the learning refresh) and approved corrections (AttendanceAdjustment) on top. The verified
attendance = the latest approved correction of a session, else Moodle's mark. Scans are never counted.
"""

from django.db import transaction
from django.utils import timezone

from apps.lms.learning import qr_url

from .models import AttendanceAdjustment, AttendanceRecord, CorporateEnrollment
from .services import CorporateError


def store_marks(cohort, marks: list[dict]) -> int:
    """Save Moodle's marks of a corporate class (from apps.lms.learning.read_attendance_marks)."""
    from apps.lms.models import LmsEnrollment

    listing_of = dict(
        LmsEnrollment.objects.filter(
            corporate_enrollment__corporate_class__cohort=cohort, moodle_user_id__isnull=False
        ).values_list("moodle_user_id", "corporate_enrollment_id")
    )
    saved = 0
    for mark in marks:
        listing_id = listing_of.get(mark["user"])
        if listing_id is None:
            continue  # a teacher, or a Moodle user TWings did not enrol
        AttendanceRecord.objects.update_or_create(
            enrollment_id=listing_id,
            session=mark["session"],
            defaults={
                "acronym": mark["acronym"],
                "description": mark["description"],
                "attended": mark["attended"],
            },
        )
        saved += 1
    return saved


def sheet(corporate_class) -> dict:
    """The class attendance sheet: sessions × learners with the verified status of each cell."""
    sessions = list(corporate_class.cohort.sessions.order_by("starts_at"))
    now = timezone.now()
    listings = list(
        corporate_class.enrollments.exclude(status__in=("cancelled", "transferred"))
        .select_related("learner")
        .order_by("learner__full_name")
    )
    records = {
        (r.enrollment_id, r.session_id): r
        for r in AttendanceRecord.objects.filter(enrollment__in=listings, session__in=sessions)
    }
    approved, pending = {}, {}
    for adj in AttendanceAdjustment.objects.filter(enrollment__in=listings, session__in=sessions).order_by(
        "created_at"
    ):
        key = (adj.enrollment_id, adj.session_id)
        if adj.decision == "approved":
            approved[key] = adj  # the latest approved wins
        elif adj.decision == "pending":
            pending[key] = adj
    rows = []
    for listing in listings:
        cells, taken, attended = {}, 0, 0
        for s in sessions:
            key = (listing.pk, s.pk)
            adj, rec = approved.get(key), records.get(key)
            if adj is not None:
                cell = {"status": adj.get_status_display(), "attended": adj.attended, "source": "adjusted"}
            elif rec is not None:
                cell = {
                    "status": rec.description or rec.acronym,
                    "attended": rec.attended,
                    "source": "moodle",
                }
            else:
                cell = {"status": "", "attended": None, "source": "none" if s.starts_at > now else "missing"}
            if key in pending:
                cell["pending"] = pending[key].pk
            if cell["attended"] is not None:
                taken += 1
                attended += int(cell["attended"])
            cells[s.pk] = cell
        rows.append(
            {
                "enrollment": listing.pk,
                "name": listing.learner.full_name,
                "email": listing.learner.email,
                "cells": cells,
                "taken": taken,
                "attended": attended,
                "rate": round(100 * attended / taken) if taken else None,
            }
        )
    return {
        "sessions": [
            {
                "id": s.pk,
                "title": s.title,
                "starts_at": s.starts_at,
                "ends_at": s.ends_at,
                "synced": bool(s.moodle_attendance_session_id),
                "qr_url": qr_url(s) if s.moodle_attendance_session_id else "",
            }
            for s in sessions
        ],
        "rows": rows,
    }


def request_adjustment(
    listing: CorporateEnrollment, session, *, status: str, reason: str, evidence: str, user
):
    if session.cohort_id != listing.corporate_class.cohort_id:
        raise CorporateError("Buổi học không thuộc lớp của học viên.")
    if listing.corporate_class.locked_at:
        raise CorporateError("Lớp đã chốt kết quả: không điều chỉnh điểm danh.")
    if not reason.strip():
        raise CorporateError("Cần ghi lý do điều chỉnh.")
    return AttendanceAdjustment.objects.create(
        enrollment=listing,
        session=session,
        status=status,
        reason=reason.strip(),
        evidence=evidence,
        requested_by=user,
    )


def decide(adjustment: AttendanceAdjustment, *, approve: bool, user) -> AttendanceAdjustment:
    with transaction.atomic():
        adjustment = AttendanceAdjustment.objects.select_for_update().get(pk=adjustment.pk)
        if adjustment.decision != "pending":
            raise CorporateError("Yêu cầu này đã được xử lý.")
        if adjustment.enrollment.corporate_class.locked_at:
            raise CorporateError("Lớp đã chốt kết quả: không điều chỉnh điểm danh.")
        adjustment.decision = "approved" if approve else "rejected"
        adjustment.decided_by, adjustment.decided_at = user, timezone.now()
        adjustment.save(update_fields=["decision", "decided_by", "decided_at", "updated_at"])
    return adjustment
