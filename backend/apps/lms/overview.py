"""
Learning overview and actions for the CMS (/app), read live from Moodle's web services (no copy of
grades or progress is kept in TWings, so nothing can drift).

Moodle is served at /learn on the same origin as the site and the CMS, so links are relative.
"""

import secrets
import time

from django.conf import settings
from django.db.models import Count

from apps.catalog.models import Course
from apps.crm.models import Order

from . import moodle
from .services import split_vietnamese_name

LEARN_PATH = "/learn"
INACTIVE_DAYS = 7
STAFF_MANAGER_ROLES = {"super_admin", "academic_management"}


def links(*, course_id: int | None = None, user_id: int | None = None) -> dict:
    out = {"home": f"{LEARN_PATH}/my/"}
    if course_id:
        out.update(
            course=f"{LEARN_PATH}/course/view.php?id={course_id}",
            participants=f"{LEARN_PATH}/user/index.php?id={course_id}",
            grades=f"{LEARN_PATH}/grade/report/grader/index.php?id={course_id}",
            completion=f"{LEARN_PATH}/report/progress/index.php?course={course_id}",
        )
    if user_id:
        out["profile"] = f"{LEARN_PATH}/user/profile.php?id={user_id}"
        if course_id:
            out["userCourse"] = f"{LEARN_PATH}/user/view.php?id={user_id}&course={course_id}"
    return out


def _progress(course: dict) -> int | None:
    return round(course["progress"]) if course.get("progress") is not None else None


def find_user(email: str) -> dict | None:
    email = (email or "").strip().lower()
    if not email:
        return None
    found = moodle.call("core_user_get_users_by_field", field="email", values=[email])
    return found[0] if found else None


def learner_overview(email: str) -> dict:
    """The learner's Moodle account and every course with progress, completion, last access, grade."""
    user = find_user(email)
    if user is None:
        return {"user": None, "courses": []}
    courses = moodle.call("core_enrol_get_users_courses", userid=user["id"], returnusercount=0)
    try:
        report = moodle.call("gradereport_overview_get_course_grades", userid=user["id"])
        grades = {g["courseid"]: g.get("grade") for g in report.get("grades", [])}
    except moodle.MoodleError:
        grades = {}
    return {
        "user": {
            "id": user["id"],
            "fullname": user.get("fullname", ""),
            "email": user.get("email", ""),
            "suspended": bool(user.get("suspended")),
            "firstaccess": user.get("firstaccess") or None,
            "lastaccess": user.get("lastaccess") or None,
            "links": links(user_id=user["id"]),
        },
        "courses": [
            {
                "id": c["id"],
                "fullname": c["fullname"],
                "shortname": c["shortname"],
                "progress": _progress(c),
                "completed": bool(c.get("completed")),
                "lastaccess": c.get("lastaccess") or None,
                "grade": grades.get(c["id"]),
                "links": links(course_id=c["id"], user_id=user["id"]),
            }
            for c in courses
        ],
    }


def _students(enrolled: list[dict]) -> list[dict]:
    return [u for u in enrolled if any(r.get("shortname") == "student" for r in u.get("roles", []))]


def course_catalog() -> list[dict]:
    """Every TWings course with the Moodle course it maps to (idnumber = id, or shortname = slug)."""
    moodle_courses = [
        c
        for c in moodle.call("core_course_get_courses_by_field", field="", value="")["courses"]
        if c.get("format") != "site"
    ]
    by_idnumber = {c["idnumber"]: c for c in moodle_courses if c.get("idnumber")}
    by_shortname = {c["shortname"]: c for c in moodle_courses}
    paid = dict(
        Order.objects.filter(status="paid", course__isnull=False)
        .values("course_id")
        .annotate(n=Count("id"))
        .values_list("course_id", "n")
    )
    rows = []
    for course in Course.objects.order_by("title"):
        mc = by_idnumber.get(course.id) or by_shortname.get(course.slug)
        mapped = None
        if mc:
            enrolled = moodle.call("core_enrol_get_enrolled_users", courseid=mc["id"])
            mapped = {
                "id": mc["id"],
                "fullname": mc["fullname"],
                "visible": bool(mc.get("visible")),
                "students": len(_students(enrolled)),
                "links": links(course_id=mc["id"]),
            }
        rows.append(
            {
                "courseId": course.id,
                "title": course.title,
                "slug": course.slug,
                "paidOrders": paid.get(course.id, 0),
                "moodle": mapped,
            }
        )
    return rows


def course_learners(moodle_course_id: int) -> list[dict]:
    """Students of a Moodle course with progress, plus their TWings order (to call or e-mail them)."""
    enrolled = moodle.call("core_enrol_get_enrolled_users", courseid=moodle_course_id)
    now = time.time()
    rows = []
    for u in _students(enrolled):
        progress, completed = None, False
        for c in moodle.call("core_enrol_get_users_courses", userid=u["id"], returnusercount=0):
            if c["id"] == moodle_course_id:
                progress, completed = _progress(c), bool(c.get("completed"))
        last = u.get("lastcourseaccess") or None
        order = (
            Order.objects.filter(customer_email__iexact=u.get("email", ""), status="paid")
            .order_by("-paid_at")
            .first()
        )
        rows.append(
            {
                "moodleUserId": u["id"],
                "fullname": u.get("fullname", ""),
                "email": u.get("email", ""),
                "suspended": bool(u.get("suspended")),
                "progress": progress,
                "completed": completed,
                "lastCourseAccess": last,
                "inactive": not completed and (last is None or now - last > INACTIVE_DAYS * 86400),
                "order": None
                if order is None
                else {
                    "id": order.id,
                    "orderCode": order.order_code,
                    "phone": order.customer_phone,
                    "crmStatus": order.crm_status,
                },
                "links": links(course_id=moodle_course_id, user_id=u["id"]),
            }
        )
    return sorted(rows, key=lambda r: (r["completed"], -(r["lastCourseAccess"] or 0)))


def set_suspended(moodle_user_id: int, suspended: bool) -> None:
    moodle.call("core_user_update_users", users=[{"id": moodle_user_id, "suspended": int(suspended)}])


def unenrol(moodle_user_id: int, moodle_course_id: int) -> None:
    moodle.call(
        "enrol_manual_unenrol_users", enrolments=[{"userid": moodle_user_id, "courseid": moodle_course_id}]
    )


def ensure_staff_access(user) -> dict:
    """
    Let a CMS user open Moodle: a Moodle account with their e-mail (they sign in with the
    "Đăng nhập bằng TWings" button, so no password is ever e-mailed) and, for training staff,
    Moodle's built-in site "manager" role (build courses, grade, see reports).
    """
    email = user.email.strip().lower()
    mu = find_user(email)
    if mu is None:
        firstname, lastname = split_vietnamese_name(user.name or email)
        mu = moodle.call(
            "core_user_create_users",
            users=[
                {
                    "username": email,
                    "auth": "manual",
                    # Never used or sent: sign-in goes through SSO.
                    "password": secrets.token_urlsafe(24) + "aZ7!",
                    "firstname": firstname[:100],
                    "lastname": lastname[:100],
                    "email": email,
                    "lang": "vi",
                    "timezone": "Asia/Ho_Chi_Minh",
                }
            ],
        )[0]
    manager = user.role in STAFF_MANAGER_ROLES
    if manager:
        moodle.call(
            "core_role_assign_roles",
            assignments=[
                {
                    "roleid": settings.MOODLE_MANAGER_ROLE_ID,
                    "userid": mu["id"],
                    "contextlevel": "system",
                    "instanceid": 0,
                }
            ],
        )
    return {"moodleUserId": mu["id"], "manager": manager, "links": links()}
