import pytest
from django.core.management import call_command

from apps.crm.models import Order
from apps.lms import moodle
from apps.lms.models import LmsEnrollment
from apps.lms.services import retry_pending, split_vietnamese_name

pytestmark = pytest.mark.django_db


class FakeMoodle:
    """In-memory stand-in for the Moodle web services TWings uses."""

    def __init__(self):
        self.users, self.courses, self.categories, self.enrolments = [], [], [], []
        self.down = False
        self.suspended, self.role_assignments, self.role_unassignments = {}, [], []

    def __call__(self, function, **params):
        if self.down:
            raise moodle.MoodleError("Không kết nối được Moodle: ConnectionError")
        return getattr(self, function)(**params)

    def core_course_get_categories(self, criteria):
        return [c for c in self.categories if c["idnumber"] == criteria[0]["value"]]

    def core_course_create_categories(self, categories):
        cat = {**categories[0], "id": len(self.categories) + 1}
        self.categories.append(cat)
        return [cat]

    def core_course_get_courses_by_field(self, field, value):
        return {"courses": [c for c in self.courses if c.get(field) == value]}

    def core_course_create_courses(self, courses):
        course = {**courses[0], "id": 100 + len(self.courses)}
        self.courses.append(course)
        return [course]

    def core_user_get_users_by_field(self, field, values):
        return [u for u in self.users if u[field] in values]

    def core_user_create_users(self, users):
        user = {**users[0], "id": 500 + len(self.users)}
        self.users.append(user)
        return [user]

    def enrol_manual_enrol_users(self, enrolments):
        self.enrolments.extend(enrolments)

    def enrol_manual_unenrol_users(self, enrolments):
        unenrolled = getattr(self, "unenrolled", [])
        unenrolled += [(e["userid"], e["courseid"]) for e in enrolments]
        self.unenrolled = unenrolled

    def core_course_duplicate_course(self, courseid, fullname, shortname, categoryid, visible, options=None):
        # Real Moodle rejects options touching settings locked by permission (e.g. users).
        assert not options, "duplicate options must stay at Moodle's defaults"
        self.duplicates = [*getattr(self, "duplicates", []), courseid]
        course = {"id": 100 + len(self.courses), "fullname": fullname, "shortname": shortname, "idnumber": ""}
        self.courses.append(course)
        return {"id": course["id"], "shortname": shortname}

    def core_course_update_courses(self, courses):
        for update in courses:
            next(c for c in self.courses if c["id"] == update["id"]).update(update)

    def core_user_update_users(self, users):
        for u in users:
            if "suspended" in u:
                self.suspended[u["id"]] = u["suspended"]
            if "auth" in u:
                next(x for x in self.users if x["id"] == u["id"])["auth"] = u["auth"]

    def core_role_assign_roles(self, assignments):
        self.role_assignments.extend(assignments)

    def core_role_unassign_roles(self, unassignments):
        self.role_unassignments.extend(unassignments)


@pytest.fixture
def fake_moodle(settings, monkeypatch):
    settings.MOODLE_INTERNAL_URL = "http://lms:8080/learn"
    settings.MOODLE_WS_TOKEN = "t" * 32
    fake = FakeMoodle()
    monkeypatch.setattr(moodle, "call", fake)
    return fake


def _paid_order(course, email="hv@example.com", **extra):
    order = Order.objects.create(
        customer_name="Nguyễn Văn An", customer_email=email, course=course, amount=500, **extra
    )
    order.status = "paid"
    order.save()
    return order


def test_paid_order_creates_account_course_and_enrolment(
    fake_moodle, course, django_capture_on_commit_callbacks
):
    with django_capture_on_commit_callbacks(execute=True):
        order = _paid_order(course)
    enrollment = LmsEnrollment.objects.get(order=order)
    assert enrollment.status == "done" and enrollment.user_created
    user = fake_moodle.users[0]
    assert (user["username"], user["firstname"], user["lastname"]) == ("hv@example.com", "An", "Nguyễn Văn")
    assert user["createpassword"] == 1 and "password" not in user  # Moodle e-mails the login itself
    assert (
        fake_moodle.courses[0]["idnumber"] == course.id and fake_moodle.courses[0]["shortname"] == course.slug
    )
    assert fake_moodle.enrolments == [
        {"roleid": 5, "userid": user["id"], "courseid": fake_moodle.courses[0]["id"]}
    ]
    assert order.timeline_activities.filter(title__icontains="LMS").exists()


def test_existing_account_and_prebuilt_course_are_reused(
    fake_moodle, course, django_capture_on_commit_callbacks
):
    fake_moodle.users.append({"id": 42, "email": "hv@example.com", "username": "hv@example.com"})
    fake_moodle.courses.append(
        {"id": 7, "shortname": course.slug, "idnumber": ""}
    )  # built by staff in Moodle
    with django_capture_on_commit_callbacks(execute=True):
        order = _paid_order(course)
    assert len(fake_moodle.users) == 1 and len(fake_moodle.courses) == 1
    assert fake_moodle.enrolments == [{"roleid": 5, "userid": 42, "courseid": 7}]
    assert LmsEnrollment.objects.get(order=order).user_created is False


def test_moodle_outage_keeps_payment_and_is_retried(fake_moodle, course, django_capture_on_commit_callbacks):
    fake_moodle.down = True
    with django_capture_on_commit_callbacks(execute=True):
        order = _paid_order(course)
    order.refresh_from_db()
    assert order.status == "paid"
    enrollment = LmsEnrollment.objects.get(order=order)
    assert enrollment.status == "failed" and "ConnectionError" in enrollment.last_error

    fake_moodle.down = False
    assert retry_pending() == {"done": 1, "failed": 0, "skipped": 0, "waiting": 0}
    assert LmsEnrollment.objects.get(order=order).status == "done"


def test_order_without_email_is_skipped(fake_moodle, course, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        order = _paid_order(course, email="")
    assert LmsEnrollment.objects.get(order=order).status == "skipped"
    assert fake_moodle.users == []


def test_unpaid_or_unconfigured_does_nothing(settings, course, django_capture_on_commit_callbacks):
    settings.MOODLE_INTERNAL_URL = ""
    with django_capture_on_commit_callbacks(execute=True):
        _paid_order(course)
        Order.objects.create(customer_name="B", customer_email="b@example.com", course=course, amount=1)
    assert LmsEnrollment.objects.count() == 0


def test_sync_command_backfills_paid_orders(fake_moodle, course, settings):
    settings.MOODLE_INTERNAL_URL = ""  # paid while the LMS did not exist yet
    _paid_order(course)
    settings.MOODLE_INTERNAL_URL = "http://lms:8080/learn"
    call_command("sync_lms_enrollments")
    assert LmsEnrollment.objects.get().status == "done"


def test_rest_parameters_use_php_array_syntax(settings, monkeypatch):
    settings.MOODLE_INTERNAL_URL, settings.MOODLE_WS_TOKEN = "http://lms:8080/learn", "tok"
    settings.MOODLE_HOST = "tuyensinh.example.vn"
    sent = {}

    class Response:
        status_code = 200

        @staticmethod
        def json():
            return {"ok": True}

    def fake_post(url, data, headers, timeout):
        sent.update(url=url, data=data, headers=headers)
        return Response()

    monkeypatch.setattr(moodle.requests, "post", fake_post)
    moodle.call("enrol_manual_enrol_users", enrolments=[{"roleid": 5, "userid": 1, "courseid": 2}])
    assert sent["url"] == "http://lms:8080/learn/webservice/rest/server.php"
    assert sent["data"]["enrolments[0][userid]"] == 1
    assert sent["data"]["wsfunction"] == "enrol_manual_enrol_users"
    assert sent["headers"] == {"Host": "tuyensinh.example.vn"}


def test_split_vietnamese_name():
    assert split_vietnamese_name("Trần Thị Bích Ngọc") == ("Ngọc", "Trần Thị Bích")
    assert split_vietnamese_name("Minh") == ("Minh", "Minh")


# ---------------------------------------------------------------- /app (CMS) learning management
class FakeMoodleAdmin(FakeMoodle):
    """Adds the read/management functions used by the CMS."""

    def __init__(self):
        super().__init__()
        self.unenrolled = []
        self.progress = {}  # (userid, courseid) -> (progress, completed)
        self.lastaccess = {}

    def core_course_get_courses_by_field(self, field, value):
        if field == "":
            return {"courses": [{"id": 1, "format": "site", "shortname": "site"}, *self.courses]}
        return super().core_course_get_courses_by_field(field, value)

    def core_user_get_users_by_field(self, field, values):
        users = super().core_user_get_users_by_field(field, values)
        return [
            {
                **u,
                "fullname": u.get("firstname", "") + " " + u.get("lastname", ""),
                "suspended": self.suspended.get(u["id"], 0),
            }
            for u in users
        ]

    def core_enrol_get_users_courses(self, userid, returnusercount):
        out = []
        for e in self.enrolments:
            if e["userid"] == userid and (userid, e["courseid"]) not in self.unenrolled:
                c = next(c for c in self.courses if c["id"] == e["courseid"])
                progress, completed = self.progress.get((userid, c["id"]), (None, False))
                out.append({**c, "progress": progress, "completed": completed, "lastaccess": 0})
        return out

    def gradereport_overview_get_course_grades(self, userid):
        return {
            "grades": [
                {"courseid": c["id"], "grade": "8,50"} for c in self.core_enrol_get_users_courses(userid, 0)
            ]
        }

    def core_enrol_get_enrolled_users(self, courseid, options=None):
        out = []
        for e in self.enrolments:
            if e["courseid"] == courseid and (e["userid"], courseid) not in self.unenrolled:
                u = next(u for u in self.users if u["id"] == e["userid"])
                out.append(
                    {
                        **u,
                        "fullname": u.get("firstname", "x"),
                        "roles": [{"shortname": "student"}],
                        "lastcourseaccess": self.lastaccess.get(u["id"], 0),
                    }
                )
        return out

    def enrol_manual_unenrol_users(self, enrolments):
        self.unenrolled += [(e["userid"], e["courseid"]) for e in enrolments]


@pytest.fixture
def fake_admin_moodle(settings, monkeypatch):
    settings.MOODLE_INTERNAL_URL = "http://lms:8080/learn"
    settings.MOODLE_WS_TOKEN = "t" * 32
    fake = FakeMoodleAdmin()
    monkeypatch.setattr(moodle, "call", fake)
    return fake


@pytest.fixture
def enrolled_order(fake_admin_moodle, course, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        return _paid_order(course)


def test_first_enrolment_sends_the_twings_access_email_once(enrolled_order):
    from apps.notifications.models import EmailLog

    logs = EmailLog.objects.filter(order=enrolled_order, template_code="lms_access")
    assert logs.count() == 1 and "Đăng nhập bằng TWings" in logs.get().rendered_html
    enrolled_order.save()  # later edits of the order
    assert logs.count() == 1


def test_order_learning_view_and_permissions(enrolled_order, staff_client, fake_admin_moodle):
    from apps.accounts.rbac import Role

    fake_admin_moodle.progress[(500, 100)] = (40.0, False)
    res = staff_client(Role.SALES_CRM).get(f"/api/v1/staff/lms/orders/{enrolled_order.id}/")
    assert res.status_code == 200
    body = res.json()
    assert body["enrollment"]["status"] == "done"
    assert body["user"]["email"] == "hv@example.com"
    assert body["courses"][0]["progress"] == 40 and body["courses"][0]["grade"] == "8,50"
    assert body["courses"][0]["links"]["course"] == "/learn/course/view.php?id=100"
    assert (
        staff_client(Role.FINANCE_ACCOUNTANT)
        .get(f"/api/v1/staff/lms/orders/{enrolled_order.id}/")
        .status_code
        == 403
    )
    # Sales may look, not act.
    res = staff_client(Role.SALES_CRM).post(
        f"/api/v1/staff/lms/orders/{enrolled_order.id}/actions/", {"action": "suspend"}, format="json"
    )
    assert res.status_code == 403


def test_unenrol_is_not_undone_by_later_order_edits(
    enrolled_order, staff_client, fake_admin_moodle, django_capture_on_commit_callbacks
):
    from apps.accounts.rbac import Role

    client = staff_client(Role.ACADEMIC_MANAGEMENT)
    url = f"/api/v1/staff/lms/orders/{enrolled_order.id}/actions/"
    res = client.post(url, {"action": "unenroll"}, format="json")
    assert res.status_code == 200 and res.json()["enrollment"]["status"] == "removed"
    assert fake_admin_moodle.unenrolled == [(500, 100)]
    with django_capture_on_commit_callbacks(execute=True):
        enrolled_order.crm_status = "6. Đang học"
        enrolled_order.save()
    assert LmsEnrollment.objects.get(order=enrolled_order).status == "removed"
    assert len(fake_admin_moodle.enrolments) == 1  # no silent re-enrolment

    for action, expected in (("suspend", 1), ("unsuspend", 0)):
        assert client.post(url, {"action": action}, format="json").status_code == 200
        assert fake_admin_moodle.suspended[500] == expected
    assert enrolled_order.timeline_activities.filter(title__icontains="Tạm khóa").exists()


def test_enrol_action_requires_paid_order(fake_admin_moodle, course, staff_client):
    from apps.accounts.rbac import Role

    order = Order.objects.create(customer_name="A B", customer_email="a@example.com", course=course, amount=1)
    res = staff_client(Role.ACADEMIC_MANAGEMENT).post(
        f"/api/v1/staff/lms/orders/{order.id}/actions/", {"action": "enroll"}, format="json"
    )
    assert res.status_code == 400


def test_course_catalog_and_learners(enrolled_order, staff_client, fake_admin_moodle):
    from apps.accounts.rbac import Role

    client = staff_client(Role.ACADEMIC_MANAGEMENT)
    rows = client.get("/api/v1/staff/lms/courses/").json()
    row = next(r for r in rows if r["courseId"] == enrolled_order.course_id)
    assert row["paidOrders"] == 1 and row["moodle"]["students"] == 1
    learners = client.get(f"/api/v1/staff/lms/courses/{row['moodle']['id']}/learners/").json()
    assert learners[0]["inactive"] is True  # never opened the course
    assert learners[0]["order"]["orderCode"] == enrolled_order.order_code


def test_open_moodle_gives_training_staff_the_manager_role(fake_admin_moodle, staff_client, settings):
    from apps.accounts.rbac import Role

    res = staff_client(Role.ACADEMIC_MANAGEMENT).post("/api/v1/staff/lms/open/", {}, format="json")
    assert res.status_code == 200 and res.json()["manager"] is True
    assert fake_admin_moodle.role_assignments[0]["roleid"] == settings.MOODLE_MANAGER_ROLE_ID
    assert "createpassword" not in fake_admin_moodle.users[0]  # no password e-mail for staff

    res = staff_client(Role.SALES_CRM).post("/api/v1/staff/lms/open/", {}, format="json")
    assert res.json()["manager"] is False and len(fake_admin_moodle.role_assignments) == 1


def test_lms_endpoints_report_unconfigured(settings, staff_client, db):
    from apps.accounts.rbac import Role

    settings.MOODLE_INTERNAL_URL = ""
    assert staff_client(Role.SUPER_ADMIN).get("/api/v1/staff/lms/courses/").status_code == 503


# ---------------------------------------------------------------- intakes, teachers, completion
def _student_enrolments(fake):
    return [e for e in fake.enrolments if e["roleid"] == 5]


def test_intake_gets_its_own_moodle_course_copied_from_the_template(
    fake_moodle, course, django_capture_on_commit_callbacks
):
    import datetime

    from apps.catalog.models import Cohort

    with django_capture_on_commit_callbacks(execute=True):
        k10 = Cohort.objects.create(
            course=course, name="Khóa 10", status="opening", start_date=datetime.date(2026, 11, 2)
        )
    template = next(c for c in fake_moodle.courses if c.get("idnumber") == course.id)
    intake = next(c for c in fake_moodle.courses if c.get("idnumber") == f"cohort:{k10.id}")
    assert fake_moodle.duplicates == [template["id"]]
    assert intake["startdate"] > 0 and "Khóa 10" in intake["fullname"]

    with django_capture_on_commit_callbacks(execute=True):
        order = _paid_order(course, cohort=k10)
    enrollment = LmsEnrollment.objects.get(order=order)
    assert enrollment.status == "done" and enrollment.cohort_id == k10.id
    assert _student_enrolments(fake_moodle)[-1]["courseid"] == intake["id"]
    assert fake_moodle.duplicates == [template["id"]]  # copied once


def test_order_waits_for_an_intake_then_moves_between_intakes(
    fake_moodle, course, django_capture_on_commit_callbacks
):
    from apps.catalog.models import Cohort

    with django_capture_on_commit_callbacks(execute=True):
        k9 = Cohort.objects.create(course=course, name="Khóa 9", status="opening")
        k10 = Cohort.objects.create(course=course, name="Khóa 10", status="upcoming")
        order = _paid_order(course)
    enrollment = LmsEnrollment.objects.get(order=order)
    assert enrollment.status == "waiting" and enrollment.attempts == 0
    assert _student_enrolments(fake_moodle) == []

    with django_capture_on_commit_callbacks(execute=True):
        order.cohort = k9
        order.save()
    enrollment.refresh_from_db()
    k9_course = next(c["id"] for c in fake_moodle.courses if c.get("idnumber") == f"cohort:{k9.id}")
    assert enrollment.status == "done" and enrollment.moodle_course_id == k9_course

    with django_capture_on_commit_callbacks(execute=True):
        order.cohort = k10
        order.save()
    enrollment.refresh_from_db()
    k10_course = next(c["id"] for c in fake_moodle.courses if c.get("idnumber") == f"cohort:{k10.id}")
    assert enrollment.moodle_course_id == k10_course and enrollment.cohort_id == k10.id
    assert fake_moodle.unenrolled == [(enrollment.moodle_user_id, k9_course)]
    assert order.timeline_activities.filter(title__icontains="chuyển sang").exists()


def test_instructors_become_editing_teachers(fake_moodle, course, django_capture_on_commit_callbacks):
    from apps.catalog.models import Cohort, Instructor

    teacher = Instructor.objects.create(name="Trần Minh Đức", title="GĐ Khối", email="duc@msb.example")
    Instructor.objects.create(name="Nghỉ", title="x", email="off@msb.example", status="on_leave")
    lead = Instructor.objects.create(name="Lê Hà", title="Trưởng nhóm", email="ha@msb.example")
    course.instructors.add(teacher, Instructor.objects.get(email="off@msb.example"))
    with django_capture_on_commit_callbacks(execute=True):
        Cohort.objects.create(course=course, name="Khóa 11", status="opening", lead_instructor=lead)
    teachers = {u["email"] for u in fake_moodle.users}
    assert {"duc@msb.example", "ha@msb.example"} <= teachers and "off@msb.example" not in teachers
    assert any(e["roleid"] == 3 for e in fake_moodle.enrolments)


def test_completion_issues_a_verifiable_certificate(
    fake_moodle, course, django_capture_on_commit_callbacks, client
):
    from apps.lms.completion import sync_all
    from apps.lms.models import Certificate
    from apps.notifications.models import EmailLog

    with django_capture_on_commit_callbacks(execute=True):
        order = _paid_order(course)
    enrollment = LmsEnrollment.objects.get(order=order)

    fake_moodle.core_enrol_get_users_courses = lambda userid, returnusercount: [
        {"id": enrollment.moodle_course_id, "progress": 42.4, "completed": False}
    ]
    assert sync_all() == {"synced": 1, "completed": 0}
    enrollment.refresh_from_db()
    assert enrollment.progress == 42 and enrollment.completed_at is None

    fake_moodle.core_enrol_get_users_courses = lambda userid, returnusercount: [
        {"id": enrollment.moodle_course_id, "progress": 100, "completed": True}
    ]
    assert sync_all() == {"synced": 1, "completed": 1}
    certificate = Certificate.objects.get(enrollment=enrollment)
    order.refresh_from_db()
    assert order.training_status == "Hoàn thành"
    assert EmailLog.objects.filter(order=order, template_code="lms_certificate").count() == 1
    assert sync_all() == {"synced": 0, "completed": 0}  # completed ones are not polled again

    page = client.get(f"/xac-minh/{certificate.code.lower()}/")
    assert page.status_code == 200 and "Nguyễn Văn An" in page.content.decode()
    assert (
        "Chứng chỉ hợp lệ" in page.content.decode() and "frame-ancestors" in page["Content-Security-Policy"]
    )
    assert client.get("/xac-minh/TWC-NOTEXISTING/").status_code == 404
    data = client.get(f"/api/v1/public/certificates/{certificate.code}/").json()
    assert data["valid"] is True and data["courseTitle"] == course.title

    certificate.revoked = True
    certificate.save()
    assert "thu hồi" in client.get(f"/xac-minh/{certificate.code}/").content.decode()


def test_catalog_lists_intakes_and_provision_endpoint(fake_admin_moodle, course, staff_client):
    from apps.accounts.rbac import Role
    from apps.catalog.models import Cohort

    k12 = Cohort.objects.create(course=course, name="Khóa 12", status="completed")  # no auto provision
    rows = staff_client(Role.ACADEMIC_MANAGEMENT).get("/api/v1/staff/lms/courses/").json()
    row = next(r for r in rows if r["courseId"] == course.id)
    assert row["cohorts"][0]["id"] == k12.id and row["cohorts"][0]["moodle"] is None
    res = staff_client(Role.ACADEMIC_MANAGEMENT).post(
        f"/api/v1/staff/lms/cohorts/{k12.id}/provision/", {}, format="json"
    )
    assert res.status_code == 200 and res.json()["moodleCourseId"]
    assert (
        staff_client(Role.SALES_CRM)
        .post(f"/api/v1/staff/lms/cohorts/{k12.id}/provision/", {}, format="json")
        .status_code
        == 403
    )


def test_deactivated_or_reroled_staff_lose_moodle_access(
    fake_admin_moodle, staff_client, settings, django_capture_on_commit_callbacks
):
    from apps.accounts.models import User
    from apps.accounts.rbac import Role

    settings.SSO_CLIENT_SECRET = "s" * 32
    client = staff_client(Role.ACADEMIC_MANAGEMENT)
    client.post("/api/v1/staff/lms/open/", {}, format="json")
    mu = fake_admin_moodle.users[0]
    assert mu["auth"] == "oauth2"  # SSO only: no Moodle password to reset around a deactivation
    staff = User.objects.get(email=mu["email"])

    with django_capture_on_commit_callbacks(execute=True):
        staff.is_active = False
        staff.save()
    assert fake_admin_moodle.suspended[mu["id"]] == 1
    assert fake_admin_moodle.role_unassignments[-1]["userid"] == mu["id"]

    with django_capture_on_commit_callbacks(execute=True):
        staff.is_active = True
        staff.save()
    assert fake_admin_moodle.suspended[mu["id"]] == 0 and len(fake_admin_moodle.role_assignments) == 2

    with django_capture_on_commit_callbacks(execute=True):
        staff.role = Role.SALES_CRM
        staff.save()
    assert len(fake_admin_moodle.role_assignments) == 2 and fake_admin_moodle.role_unassignments

    calls = len(fake_admin_moodle.role_unassignments)
    with django_capture_on_commit_callbacks(execute=True):
        staff.name = "Đổi tên"  # unrelated edits do not touch Moodle
        staff.save()
    assert len(fake_admin_moodle.role_unassignments) == calls


def test_refunded_learner_is_suspended_unless_another_order_still_gives_access(
    fake_admin_moodle, course, django_capture_on_commit_callbacks
):
    with django_capture_on_commit_callbacks(execute=True):
        first = _paid_order(course)
    mu_id = fake_admin_moodle.users[0]["id"]

    with django_capture_on_commit_callbacks(execute=True):
        second = _paid_order(course, customer_phone="0900000000")

    def refund(order):
        order = Order.objects.get(pk=order.pk)  # as the refund view does (fresh enrolment relation)
        with django_capture_on_commit_callbacks(execute=True):
            order.status = "refunded"
            order.save()

    refund(first)
    assert fake_admin_moodle.suspended.get(mu_id, 0) == 0  # still studying through the second order
    refund(second)
    assert fake_admin_moodle.suspended[mu_id] == 1


def test_with_the_task_queue_payments_never_wait_for_moodle(
    fake_moodle, course, settings, django_capture_on_commit_callbacks
):
    from django.core.management import call_command

    settings.TASKS = {"default": {"BACKEND": "django_tasks_db.DatabaseBackend", "QUEUES": ["default"]}}
    with django_capture_on_commit_callbacks(execute=True):
        order = _paid_order(course)
    # The payment committed and answered: Moodle was not called, the enrolment waits in the queue.
    assert fake_moodle.users == [] and not LmsEnrollment.objects.filter(order=order).exists()

    call_command("db_worker", batch=True, startup_delay=False)  # what the worker container does
    enrollment = LmsEnrollment.objects.get(order=order)
    assert enrollment.status == "done" and fake_moodle.enrolments
