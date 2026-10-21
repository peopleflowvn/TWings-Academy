"""
Two-level approval of money decisions (acceptance batches, expenses). Below the threshold one approver
with corporate.approve is enough, as before. From the threshold up (đồng, VAT included) the first
approval is recorded and a second person, different from the first and holding corporate.approve_final,
gives the final one. Thresholds: settings.CORPORATE_SECOND_APPROVAL_FROM (0 = one level only).
"""

from django.conf import settings
from django.utils import timezone

from apps.accounts.rbac import has_perm_code

from .services import CorporateError


def threshold(kind: str) -> int:
    return int(settings.CORPORATE_SECOND_APPROVAL_FROM.get(kind) or 0)


def levels(kind: str, value: int) -> int:
    limit = threshold(kind)
    return 2 if limit and value >= limit else 1


def approve(obj, *, kind: str, value: int, user) -> bool:
    """
    Record one approval on obj (first_approved_* / approved_* fields, not saved). True when this one is
    final, False when it was the first of two.
    """
    now = timezone.now()
    if levels(kind, value) == 1:
        obj.approved_by, obj.approved_at = user, now
        return True
    if not obj.first_approved_at:
        obj.first_approved_by, obj.first_approved_at = user, now
        return False
    if obj.first_approved_by_id == user.pk:
        raise CorporateError("Cấp duyệt thứ hai phải là người khác người đã duyệt cấp một.")
    if not has_perm_code(user, "corporate.approve_final"):
        amount = f"{threshold(kind):,}".replace(",", ".")
        raise CorporateError(f"Khoản từ {amount} đ cần người có quyền “Duyệt cấp cuối” duyệt lần hai.")
    obj.approved_by, obj.approved_at = user, now
    return True


def state(obj, *, kind: str, value: int) -> dict:
    """What the screens show: levels needed, who approved so far."""
    return {
        "levels": levels(kind, value),
        "first_by": obj.first_approved_by.name if obj.first_approved_by_id else "",
        "first_at": obj.first_approved_at,
    }
