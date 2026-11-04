"""
The stages of a registration (Order.crm_status, the CRM kanban). A registration keeps the stage's fixed
code; its name, its place in the kanban and the stages added since are a list (danh mục "crm_stage",
ListItem.code / .group) edited in /app → Hệ thống → Danh mục, so a renamed or reordered stage changes no
record and no rule. The first names are the old CRM's "Trạng thái khách hàng" (sheet "Danh mục", column G).

What a stage does comes from its group:

    open        still being won: assignment, response alerts, journeys     1. Tiềm năng … 4. Cần đóng học phí
    paid        set from the recorded payments, never by hand              5. Đã đóng phí, 6. Đã đóng 1 phần
    onboard     in class (set by hand, only once they may study)           7. Onboard
    call_again  refused for now: a call-back day is asked for (a task)     0. Từ chối lần 1 / 2
    closed      lost: the reason is asked for (or carried), an unpaid      0. Từ chối lần 3, Không gọi được,
                registration is cancelled, no reminder                     Đăng ký nhầm, Test

The 13 stages below are the system's: they can be renamed and ordered, not hidden or deleted. A stage added
in the list belongs to the open, call_again or closed group (paid / onboard follow the money).
"""

import re

KIND = "crm_stage"

POTENTIAL = "potential"
CONSULTING = "consulting"
AGREED = "agreed"
TO_PAY = "to_pay"
PAID = "paid"
PART_PAID = "part_paid"
ONBOARD = "onboard"
REFUSED_1 = "refused_1"
REFUSED_2 = "refused_2"
REFUSED_3 = "refused_3"
UNREACHABLE = "unreachable"
MISTAKEN = "mistaken"
TEST = "test"

G_OPEN, G_PAID, G_ONBOARD, G_CALL_AGAIN, G_CLOSED = "open", "paid", "onboard", "call_again", "closed"
GROUPS = {
    G_OPEN: "Đang chăm sóc",
    G_PAID: "Đã đóng phí (theo thanh toán)",
    G_ONBOARD: "Đang học",
    G_CALL_AGAIN: "Từ chối – hẹn gọi lại",
    G_CLOSED: "Đóng (mất lead)",
}
CUSTOM_GROUPS = (G_OPEN, G_CALL_AGAIN, G_CLOSED)  # the groups a stage added in the list may have

# (code, first name, group), in kanban order: the system's stages.
DEFAULTS = [
    (POTENTIAL, "1. Tiềm năng", G_OPEN),
    (CONSULTING, "2. Đang tư vấn", G_OPEN),
    (AGREED, "3. Đồng ý học", G_OPEN),
    (TO_PAY, "4. Cần đóng học phí", G_OPEN),
    (PAID, "5. Đã đóng phí", G_PAID),
    (PART_PAID, "6. Đã đóng 1 phần học phí", G_PAID),
    (ONBOARD, "7. Onboard", G_ONBOARD),
    (REFUSED_1, "0. Từ chối lần 1", G_CALL_AGAIN),
    (REFUSED_2, "0. Từ chối lần 2", G_CALL_AGAIN),
    (REFUSED_3, "0. Từ chối lần 3", G_CLOSED),
    (UNREACHABLE, "0. Không gọi được", G_CLOSED),
    (MISTAKEN, "0. Đăng ký nhầm", G_CLOSED),
    (TEST, "0. Test", G_CLOSED),
]
BUILTIN = {code: group for code, _, group in DEFAULTS}
# The old CRM's spelling of each stage (its "Trạng thái" column), for the imported data.
OLD_CRM = {name: code for code, name, _ in DEFAULTS}

ENROLLED = (PAID, PART_PAID, ONBOARD)  # may study (paid in full / in part)
FROM_PAYMENTS = (PAID, PART_PAID)
# The lost reason a closed stage carries by itself (the others ask for one).
CLOSED_REASON = {UNREACHABLE: "Không liên lạc được", MISTAKEN: "Đăng ký trùng / nhầm", TEST: "Dữ liệu test"}


def table(include_hidden: bool = True) -> list[dict]:
    """The stages in kanban order: [{code, name, group, active, builtin}]."""
    from .models import ListItem

    rows = ListItem.objects.filter(kind=KIND).exclude(code="").order_by("position", "value")
    if not include_hidden:
        rows = rows.filter(is_active=True)
    found = [
        {
            "code": r.code,
            "name": r.value,
            "group": BUILTIN.get(r.code, r.group),
            "active": r.is_active,
            "builtin": r.code in BUILTIN,
        }
        for r in rows
    ]
    have = {r["code"] for r in found}
    # A system stage missing from the list (never expected) still works, under its first name.
    return found + [
        {"code": c, "name": n, "group": g, "active": True, "builtin": True}
        for c, n, g in DEFAULTS
        if c not in have
    ]


def codes(*groups: str) -> list[str]:
    """The codes of the stages in these groups (every stage when none is given)."""
    return [r["code"] for r in table() if not groups or r["group"] in groups]


def in_groups(*groups: str):
    """For a query (crm_status__in=…): the codes of the stages in these groups, read when the query runs."""
    from .models import ListItem

    return ListItem.objects.filter(kind=KIND, group__in=groups).exclude(code="").values("code")


def open_codes() -> list[str]:
    return codes(G_OPEN)


def call_again_codes() -> list[str]:
    return codes(G_CALL_AGAIN)


def closed_codes() -> list[str]:
    return codes(G_CLOSED)


def group_of(code: str) -> str:
    if code in BUILTIN:
        return BUILTIN[code]
    return next((r["group"] for r in table() if r["code"] == code), "")


def names() -> dict[str, str]:
    return {r["code"]: r["name"] for r in table()}


def name(code: str) -> str:
    return names().get(code, code)


def short(code: str) -> str:
    """The name without its number ("0. Từ chối lần 1" -> "Từ chối lần 1")."""
    return re.sub(r"^\s*\d+\s*[.)]\s*", "", name(code))


def code_of(text) -> str:
    """The code of a stage given by its code, its name now or its old CRM spelling ('' when none)."""
    text = " ".join(str(text or "").split())
    if not text:
        return ""
    rows = table()
    for r in rows:
        if text == r["code"] or text == r["name"]:
            return r["code"]
    return OLD_CRM.get(text, "")


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
    """Where a registration in a former stage (or a stage written by its name) goes."""
    stage = order.crm_status
    if stage in (PAID, OLD_CRM["5. Đã đóng phí"]) or order.learning_access:
        return paid_stage(order)  # "5. Đã đóng phí" was also an installment's first payment
    if stage in BUILTIN:
        return stage
    if stage in OLD_CRM:
        return OLD_CRM[stage]
    if stage == "7. Đã hủy":
        return FORMER_LOST.get(order.lost_reason, REFUSED_3)
    return FORMER.get(stage, POTENTIAL)
