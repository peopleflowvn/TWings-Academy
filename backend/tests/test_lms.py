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
