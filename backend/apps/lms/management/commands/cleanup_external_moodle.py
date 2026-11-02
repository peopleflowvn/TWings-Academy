"""
manage.py cleanup_external_moodle [--apply]

Undo what reached Moodle for classes taught on another platform (Cohort.external_lms: the old RB / EB
classes imported from the previous CRM, enrolled by the 30-minute sweep on 02/11/2026 before it skipped
them): their Moodle courses are emptied and hidden and the Moodle accounts that enrolment created suspended
(unless in another course), then deleted by the Ops task with Moodle's CLI (the integration may not
delete); the enrolment records say "skipped". Preview unless --apply. Sends nothing; prints ids only.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

SKIPPED = "Lớp học trên nền tảng khác – đã gỡ khỏi Moodle"


class Command(BaseCommand):
    help = "Gỡ khỏi Moodle các lớp học trên nền tảng khác (xem trước nếu không có --apply)."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")

    def handle(self, apply, **options):
        from apps.catalog.models import Cohort
        from apps.crm.models import Activity
        from apps.lms import moodle
        from apps.lms.models import LmsEnrollment
        from apps.lms.services import COHORT_PREFIX

        out = self.stdout.write
        if not moodle.is_configured():
            out("LMS chưa cấu hình.")
            return

        # The Moodle course of each external class (found by its idnumber, never trusted from a record).
        courses = {}
        for cohort in Cohort.objects.filter(external_lms=True).order_by("code"):
            found = moodle.call(
                "core_course_get_courses_by_field", field="idnumber", value=f"{COHORT_PREFIX}{cohort.id}"
            )
            for c in found["courses"]:
                courses[c["id"]] = cohort.code
        out(
            f"Khóa Moodle của lớp cũ: {len(courses)} — "
            + ", ".join(f"{i} ({code})" for i, code in sorted(courses.items()))
        )

        enrollments = list(
            LmsEnrollment.objects.filter(
                Q(order__cohort__external_lms=True) | Q(moodle_course_id__in=list(courses)),
                order__attribution__has_key="legacy_code",
            )
            .exclude(status="skipped", moodle_course_id__isnull=True)
            .select_related("order")
        )
        out(f"Bản ghi ghi danh cần sửa: {len(enrollments)}")

        # Accounts that enrolment created, unless the person studies something else on Moodle.
        created = sorted({e.moodle_user_id for e in enrollments if e.user_created and e.moodle_user_id})
        other_records = set(
            LmsEnrollment.objects.filter(moodle_user_id__in=created)
            .exclude(pk__in=[e.pk for e in enrollments])
            .values_list("moodle_user_id", flat=True)
        )
        delete_users, keep_users = [], []
        for user_id in created:
            elsewhere = [
                c["id"]
                for c in moodle.call("core_enrol_get_users_courses", userid=user_id, returnusercount=0)
                if c["id"] not in courses
            ]
            (keep_users if elsewhere or user_id in other_records else delete_users).append(user_id)
        out(
            f"Tài khoản Moodle do lần ghi danh nhầm tạo ra: {len(created)}; sẽ xóa {len(delete_users)}, "
            f"giữ {len(keep_users)} (có khóa / đăng ký khác){': ' + str(keep_users) if keep_users else ''}"
        )

        if not apply:
            out("Xem trước: chưa thay đổi gì (thêm --apply).")
            return

        # What the integration may do: take the learners out, hide the courses, suspend the accounts.
        # Deleting them needs rights the integration does not have (on purpose): the Ops task deletes
        # the ids printed on the MOODLE_DELETE line with Moodle's own CLI.
        pairs = [
            {"userid": e.moodle_user_id, "courseid": e.moodle_course_id}
            for e in enrollments
            if e.moodle_user_id and e.moodle_course_id in courses
        ]
        if pairs:
            moodle.call("enrol_manual_unenrol_users", enrolments=pairs)
        if courses:
            moodle.call(
                "core_course_update_courses", courses=[{"id": i, "visible": 0} for i in sorted(courses)]
            )
        if delete_users:
            moodle.call("core_user_update_users", users=[{"id": u, "suspended": 1} for u in delete_users])
        out(f"Đã gỡ {len(pairs)} lượt ghi danh, ẩn {len(courses)} khóa, khóa {len(delete_users)} tài khoản.")
        out(
            "MOODLE_DELETE courses="
            + ",".join(str(i) for i in sorted(courses))
            + " users="
            + ",".join(str(u) for u in delete_users)
        )

        with transaction.atomic():
            for e in enrollments:
                gone = e.moodle_user_id in delete_users
                e.status, e.last_error = "skipped", SKIPPED
                e.moodle_course_id, e.enrolled_at = None, None
                if gone:
                    e.moodle_user_id = None
                e.save()
                Activity.objects.create(
                    order=e.order,
                    type="note",
                    title="Đã gỡ khỏi Moodle",
                    content="Lớp học trên nền tảng khác (lớp cũ): khóa Moodle tạo nhầm đã gỡ"
                    + ("; tài khoản Moodle tạo nhầm đã xóa." if gone else "."),
                    actor="Hệ thống LMS",
                )
        out(f"Đã cập nhật {len(enrollments)} bản ghi ghi danh. Xong.")
