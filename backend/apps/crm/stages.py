"""
The stages of a registration (Order.crm_status, the CRM kanban): the "Trạng thái khách hàng" of the CRM run
before this system (sheet "Danh mục", column G), so the old data and the new read the same way.

    1. Tiềm năng              a new lead, nobody has reached them yet (the response-time clock runs)
    2. Đang tư vấn            being advised (a consultant reached them, an appointment was booked…)
    3. Đồng ý học             agreed to study, not yet asked to pay
    4. Cần đóng học phí       asked to pay (an online checkout starts here)
    5. Đã đóng phí            paid in full                     } set from the recorded payments,
    6. Đã đóng 1 phần học phí paid part (an installment)       } never by hand
    7. Onboard                in class (set by hand, only once they may study)
    0. Từ chối lần 1 / 2      refused, to call again (a call-back day is asked for)
    0. Từ chối lần 3          refused for good (the reason is asked for)
    0. Không gọi được         never reached                    } closed: an unpaid registration is
    0. Đăng ký nhầm           a mistaken / duplicate sign-up   } cancelled, no reminder, out of the
    0. Test                   a test, left out of the reports  } funnel
"""

POTENTIAL = "1. Tiềm năng"
CONSULTING = "2. Đang tư vấn"
AGREED = "3. Đồng ý học"
TO_PAY = "4. Cần đóng học phí"
PAID = "5. Đã đóng phí"
PART_PAID = "6. Đã đóng 1 phần học phí"
ONBOARD = "7. Onboard"
REFUSED_1 = "0. Từ chối lần 1"
REFUSED_2 = "0. Từ chối lần 2"
REFUSED_3 = "0. Từ chối lần 3"
UNREACHABLE = "0. Không gọi được"
MISTAKEN = "0. Đăng ký nhầm"
TEST = "0. Test"

# Kanban order: the way forward, then the refusals.
STAGES = [
    POTENTIAL,
    CONSULTING,
    AGREED,
    TO_PAY,
    PAID,
    PART_PAID,
    ONBOARD,
    REFUSED_1,
    REFUSED_2,
    REFUSED_3,
    UNREACHABLE,
    MISTAKEN,
    TEST,
]
CHOICES = [(s, s) for s in STAGES]

OPEN = (POTENTIAL, CONSULTING, AGREED, TO_PAY)  # still being won: assignment, response alerts, journeys
ENROLLED = (PAID, PART_PAID, ONBOARD)  # may study (paid in full / in part)
FROM_PAYMENTS = (PAID, PART_PAID)
CALL_AGAIN = (REFUSED_1, REFUSED_2)  # a call-back day is asked for
CLOSED = (REFUSED_3, UNREACHABLE, MISTAKEN, TEST)  # lost: an unpaid registration is cancelled
# The lost reason a closed stage carries by itself ("Từ chối lần 3" asks for one).
CLOSED_REASON = {UNREACHABLE: "Không liên lạc được", MISTAKEN: "Đăng ký trùng / nhầm", TEST: "Dữ liệu test"}


def paid_stage(order) -> str:
    """The stage of a registration that may study: in class stays in class, else by what was paid."""
    if order.crm_status == ONBOARD:
        return ONBOARD
    receivable = order.total_receivable or order.amount
    return (
        PAID
        if order.status == "paid" or (receivable and order.total_paid_amount >= receivable)
        else PART_PAID
    )


# The stages used before (1. Mới … 7. Đã hủy) -> this list, for registrations made in this system.
FORMER = {
    "1. Mới": POTENTIAL,
    "2. Đã tiếp cận": CONSULTING,
    "3. Đang tư vấn": CONSULTING,
    "4. Hẹn gặp": CONSULTING,
    "6. Chăm sóc lại": REFUSED_1,
}
FORMER_LOST = {"Không liên lạc được": UNREACHABLE, "Đăng ký trùng / nhầm": MISTAKEN}


def from_former(order) -> str:
    """Where a registration in a former stage goes."""
    stage = order.crm_status
    if stage == PAID or order.learning_access:  # "5. Đã đóng phí" was also an installment's first payment
        return paid_stage(order)
    if stage in STAGES:
        return stage
    if stage == "7. Đã hủy":
        return FORMER_LOST.get(order.lost_reason, REFUSED_3)
    return FORMER.get(stage, POTENTIAL)
