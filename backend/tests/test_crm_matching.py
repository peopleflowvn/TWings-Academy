"""Smart matching: who is the same person, who may be, who is not."""

import datetime

import pytest

from apps.crm.matching import COMPATIBLE, DIFFERENT, SAME, compare_names, email_key, name_key
from apps.crm.models import Learner, LearnerMatch, Order
from apps.crm.services import flag_duplicates
from tests.conftest import Role

pytestmark = pytest.mark.django_db


def test_keys():
    assert email_key(" N.Bich.Duyen+khoa9@GoogleMail.com ") == "nbichduyen@gmail.com"
    assert email_key("duyen+x@twings.edu.vn") == "duyen@twings.edu.vn"
    assert email_key("duyen@gmai.com") == "duyen@gmai.com"  # a domain typo is only a possible match
    assert name_key("Nguyễn  Bích ĐUYÊN") == "nguyen bich duyen"
    assert compare_names("Nguyễn Bích Duyên", "nguyen bich duyen") == SAME
    assert compare_names("Duyên", "Nguyễn Bích Duyên") == COMPATIBLE
    assert compare_names("Duyen Nguyen", "Nguyễn Bích Duyên") == COMPATIBLE
    assert compare_names("Nguyễn Bích Duyn", "Nguyễn Bích Duyên") == COMPATIBLE
    assert compare_names("Trần Văn Bình", "Nguyễn Bích Duyên") == DIFFERENT


def _lead(course, **kw):
    order = Order.objects.create(course=course, **kw)
    flag_duplicates(order)
    order.refresh_from_db()
    return order


def test_gmail_spelling_and_name_variant_are_the_same_person(course):
    first = _lead(course, customer_name="Nguyễn Bích Duyên", customer_email="bich.duyen@gmail.com")
    again = _lead(course, customer_name="Duyen", customer_email="BichDuyen+web@gmail.com")
    assert again.learner_id == first.learner_id and again.duplicate_kind == "same"


def test_shared_phone_with_another_name_is_another_person_to_review(course):
    child1 = _lead(course, customer_name="Nguyễn Văn An", customer_phone="0912345678")
    child2 = _lead(course, customer_name="Nguyễn Thị Bình", customer_phone="0912 345 678")
    assert child1.learner_id != child2.learner_id
    match = LearnerMatch.objects.get()
    assert "khác tên" in match.reason
    assert child2.duplicate_kind == "possible" and child2.duplicate_match_id == match.pk
    child1.refresh_from_db()
    assert child1.duplicate_kind == "possible"


def test_same_name_with_a_phone_typo_is_a_possible_match(course):
    _lead(course, customer_name="Nguyễn Bích Duyên", customer_phone="0912345678")
    other = _lead(course, customer_name="Nguyễn Bích Duyên", customer_phone="0912345687")
    assert other.duplicate_kind == "possible"
    assert "lệch 1 chữ số" in LearnerMatch.objects.get().reason


def test_same_mailbox_on_a_mistyped_domain_is_a_possible_match(course):
    _lead(course, customer_name="Duyên", customer_email="bichduyen@gmail.com")
    other = _lead(course, customer_name="Nguyễn Bích Duyên", customer_email="bichduyen@gmai.com")
    assert other.duplicate_kind == "possible"


def test_same_name_alone_is_nobody(course):
    _lead(course, customer_name="Nguyễn Văn An", customer_phone="0911111111")
    _lead(course, customer_name="Nguyễn Văn An", customer_phone="0988888888")
    assert not LearnerMatch.objects.exists() and not Order.objects.filter(is_duplicate=True).exists()


def test_staff_decide_same_merges_different_dismisses_for_good(staff_client, course):
    a = _lead(course, customer_name="Nguyễn Văn An", customer_phone="0912345678")
    b = _lead(course, customer_name="Nguyễn Thị Bình", customer_phone="0912345678")
    client = staff_client(Role.SUPER_ADMIN)
    match = LearnerMatch.objects.get()
    listed = client.get("/api/v1/staff/learner-matches/").json()
    assert listed[0]["id"] == str(match.pk) or listed[0]["id"] == match.pk

    assert client.post(f"/api/v1/staff/learner-matches/{match.pk}/different/").status_code == 200
    a.refresh_from_db()
    b.refresh_from_db()
    assert not a.is_duplicate and not b.is_duplicate
    # A new registration of the same pair does not ask again.
    _lead(course, customer_name="Nguyễn Thị Bình", customer_phone="0912345678", customer_email="b@x.vn")
    assert LearnerMatch.objects.filter(status="open").count() == 0


def test_staff_decide_same_person(staff_client, course):
    a = _lead(course, customer_name="Nguyễn Bích Duyên", customer_phone="0912345678")
    b = _lead(course, customer_name="Nguyễn Bích Duyên", customer_phone="0912345687")
    match = LearnerMatch.objects.get()
    res = staff_client(Role.SUPER_ADMIN).post(f"/api/v1/staff/learner-matches/{match.pk}/same/")
    assert res.status_code == 200, res.content
    a.refresh_from_db()
    b.refresh_from_db()
    assert a.learner_id == b.learner_id and Learner.objects.count() == 1
    assert a.duplicate_kind == b.duplicate_kind == "same"  # now "Giữ cái này" resolves the registrations


def test_cccd_wins_and_birth_date_helps(course):
    first = _lead(course, customer_name="Nguyễn Bích Duyên", customer_phone="0900000001")
    Learner.objects.filter(pk=first.learner_id).update(birth_date=datetime.date(2000, 1, 2))
    from apps.crm.matching import candidates

    found = candidates(
        full_name="Nguyễn Bích Duyên", phone="0977777777", birth_date=datetime.date(2000, 1, 2)
    )
    assert found and not found[0].sure and "ngày sinh" in found[0].reason
