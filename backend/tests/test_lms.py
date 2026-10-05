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
    assert retry_pending() == {"done": 1, "failed": 0, "skipped": 0}
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
        self.suspended, self.unenrolled, self.role_assignments = {}, [], []
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

    def core_user_update_users(self, users):
        for u in users:
            self.suspended[u["id"]] = u["suspended"]

    def core_role_assign_roles(self, assignments):
        self.role_assignments.extend(assignments)


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
