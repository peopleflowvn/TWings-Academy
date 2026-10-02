import secrets

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.rbac import Role
from apps.catalog.models import Cohort, Coupon, Course


@pytest.fixture
def api():
    return APIClient(enforce_csrf_checks=True)


def make_staff(role, email=None):
    return User.objects.create_user(
        email=email or f"{role}-{secrets.token_hex(3)}@twings.test",
        password="Very-Strong-Passw0rd!",
        name=role,
        role=role,
        is_staff=True,
    )


@pytest.fixture
def staff_client():
    """Return a factory: staff_client(role) -> logged-in APIClient (CSRF checks disabled for brevity)."""

    def _make(role):
        client = APIClient()
        client.force_authenticate(make_staff(role))
        return client

    return _make


@pytest.fixture
def course(db):
    return Course.objects.create(
        slug="rm-doanh-nghiep",
        title="RM Doanh Nghiệp",
        price=8_490_000,
        original_price=12_000_000,
        syllabus=[
            {
                "id": "m1",
                "title": "Module 1",
                "lessons": [
                    {
                        "id": "l1",
                        "title": "Giới thiệu",
                        "type": "video",
                        "is_free_preview": True,
                        "youtube_id": "abc",
                        "quiz_questions": [{"correct_answer_id": "a"}],
                    },
                    {
                        "id": "l2",
                        "title": "Bài trả phí",
                        "type": "video",
                        "is_free_preview": False,
                        "video_url": "https://secret.example/video.mp4",
                        "reading_content": "paid",
                    },
                ],
            }
        ],
    )


@pytest.fixture
def cohorts(course):
    nxt = Cohort.objects.create(course=course, name="Khóa học 10", status="opening")
    full = Cohort.objects.create(course=course, name="Khóa học 9", status="full", next_cohort=nxt)
    return full, nxt


@pytest.fixture
def coupon(db):
    return Coupon.objects.create(code="HOCBONG20", discount_percent=20, max_discount_amount=1_000_000)


@pytest.fixture
def registration_payload(course):
    return {
        "courseId": course.pk,
        "customerName": "Nguyễn Văn A",
        "customerPhone": "0912345678",
        "customerEmail": "a@example.com",
        "privacyConsent": True,
    }


__all__ = ["make_staff", "Role"]
