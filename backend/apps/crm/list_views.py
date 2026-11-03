"""
The option lists (danh mục): every /app form reads them (GET crm/lists/); people with "system.lists"
manage them in /app → Hệ thống → Danh mục (lists/…): add, rename (carried onto the records), hide, order,
delete an unused value, or rewrite a value found in the records that is not in the list.
"""

from django.db import IntegrityError, transaction
from django.db.models import Max
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import require_perms
from apps.core.models import audit

from . import lists
from .models import ListItem


class IsActiveStaff(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and user.is_staff)


class CrmListsView(APIView):
    """GET: every list's offered values (sources, provinces, schools, course categories…)."""

    permission_classes = [IsActiveStaff]

    def get(self, request):
        return Response(lists.all_lists())


def _kind(key: str) -> lists.Kind:
    if key not in lists.KIND:
        raise NotFound("Không có danh mục này.")
    return lists.KIND[key]


def _clean(value) -> str:
    value = " ".join(str(value or "").split())
    if not value:
        raise ValidationError({"value": "Nhập giá trị."})
    if len(value) > 300:
        raise ValidationError({"value": "Tối đa 300 ký tự."})
    return value


def _kind_payload(kind: lists.Kind) -> dict:
    used = lists.usage(kind.key)
    items = list(ListItem.objects.filter(kind=kind.key).order_by("position", "value"))
    listed = {i.value for i in items}
    return {
        "key": kind.key,
        "label": kind.label,
        "group": kind.group,
        "hint": kind.hint,
        "items": [
            {"id": i.id, "value": i.value, "active": i.is_active, "used": used.get(i.value, 0)} for i in items
        ],
        # Values the records have that the list does not (typed freely, imported, or renamed away).
        "unlisted": sorted(
            ({"value": v, "used": n} for v, n in used.items() if v not in listed),
            key=lambda r: (-r["used"], r["value"]),
        ),
    }


class Manage(APIView):
    def get_permissions(self):
        return [require_perms("system.lists")()]


class ListsAdminView(Manage):
    """GET: the lists with their values, how often each is used and the values found outside them."""

    def get(self, request):
        return Response({"kinds": [_kind_payload(k) for k in lists.KINDS]})


class ListKindView(Manage):
    """POST {value}: add a value at the end of the list (or show a hidden one again)."""

    def post(self, request, kind):
        kind = _kind(kind)
        value = _clean(request.data.get("value"))
        item = ListItem.objects.filter(kind=kind.key, value=value).first()
        if item and item.is_active:
            raise ValidationError({"value": "Giá trị này đã có trong danh mục."})
        if item:
            item.is_active = True
            item.save(update_fields=["is_active", "updated_at"])
        else:
            last = ListItem.objects.filter(kind=kind.key).aggregate(m=Max("position"))["m"]
            item = ListItem.objects.create(kind=kind.key, value=value, position=(last or 0) + 1)
        audit(request, "lists.add", item, kind=kind.key, value=value)
        return Response(_kind_payload(kind), status=status.HTTP_201_CREATED)


class ListOrderView(Manage):
    """POST {ids}: the list's values in this order (ids not given keep their place after them)."""

    def post(self, request, kind):
        kind = _kind(kind)
        ids = [str(i) for i in request.data.get("ids") or []]
        items = {i.id: i for i in ListItem.objects.filter(kind=kind.key)}
        rest = [i for i in sorted(items.values(), key=lambda i: (i.position, i.value)) if i.id not in ids]
        ordered = [items[i] for i in dict.fromkeys(ids) if i in items] + rest
        for position, item in enumerate(ordered):
            item.position = position
        ListItem.objects.bulk_update(ordered, ["position"])
        return Response(_kind_payload(kind))


class ListItemView(Manage):
    """
    PATCH {value?, active?}: rename (the records that have the old value get the new one; renaming to a
    value already in the list merges the two) and / or hide / show. DELETE: only a value no record has.
    """

    def _item(self, pk) -> ListItem:
        item = ListItem.objects.filter(pk=pk, kind__in=lists.KIND).first()
        if item is None:
            raise NotFound("Không tìm thấy giá trị.")
        return item

    def patch(self, request, pk):
        item = self._item(pk)
        kind = lists.KIND[item.kind]
        changed = 0
        with transaction.atomic():
            if "value" in request.data:
                old, new = item.value, _clean(request.data.get("value"))
                if new != old:
                    other = ListItem.objects.filter(kind=item.kind, value=new).exclude(pk=item.pk).first()
                    changed = lists.replace_in_records(item.kind, old, new)
                    if other:  # merge: the other value stays, this one goes
                        other.is_active = True
                        other.save(update_fields=["is_active", "updated_at"])
                        item.delete()
                        audit(
                            request, "lists.merge", other, kind=item.kind, old=old, new=new, records=changed
                        )
                        return Response({**_kind_payload(kind), "records": changed})
                    item.value = new
                    try:
                        with transaction.atomic():
                            item.save(update_fields=["value", "updated_at"])
                    except IntegrityError:
                        raise ValidationError({"value": "Giá trị này đã có trong danh mục."}) from None
                    audit(request, "lists.rename", item, kind=item.kind, old=old, new=new, records=changed)
            if "active" in request.data:
                item.is_active = bool(request.data.get("active"))
                item.save(update_fields=["is_active", "updated_at"])
                audit(request, "lists.show" if item.is_active else "lists.hide", item, value=item.value)
        return Response({**_kind_payload(kind), "records": changed})

    def delete(self, request, pk):
        item = self._item(pk)
        used = lists.usage(item.kind).get(item.value, 0)
        if used:
            raise ValidationError(
                {"value": f"{used} hồ sơ đang dùng giá trị này: hãy ẩn, hoặc đổi tên / gộp vào giá trị khác."}
            )
        audit(request, "lists.delete", item, kind=item.kind, value=item.value)
        item.delete()
        return Response(_kind_payload(lists.KIND[item.kind]))


class ListReplaceView(Manage):
    """POST {from, to}: write `to` (a value of the list) wherever the records have `from`."""

    def post(self, request, kind):
        kind = _kind(kind)
        old = str(request.data.get("from") or "")
        new = _clean(request.data.get("to"))
        if not old or old == new:
            raise ValidationError({"from": "Chọn giá trị cần thay."})
        if not ListItem.objects.filter(kind=kind.key, value=new).exists():
            raise ValidationError({"to": "Chỉ thay bằng một giá trị có trong danh mục."})
        with transaction.atomic():
            changed = lists.replace_in_records(kind.key, old, new)
        audit(request, "lists.replace", None, kind=kind.key, old=old, new=new, records=changed)
        return Response({**_kind_payload(kind), "records": changed})
