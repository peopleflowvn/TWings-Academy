"""
The option lists (danh mục): every /app form reads them (GET crm/lists/); people with "system.lists"
manage them in /app → Hệ thống → Danh mục (lists/…): add, rename (carried onto the records), hide, order,
delete an unused value, or rewrite a value found in the records that is not in the list. The CRM stages
(apps.crm.stages) are a list too: the system's 13 can be renamed and ordered; a stage added picks what it
does (its group).
"""

import uuid

from django.db import IntegrityError, transaction
from django.db.models import Max
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import require_perms
from apps.core.models import audit

from . import lists, stages
from .models import ListItem

SYSTEM_VALUE = "Hệ thống tự ghi / dựa vào giá trị này nên không đổi tên, ẩn hay xóa được (chỉ sắp xếp)."
SYSTEM_STAGE = "Giai đoạn hệ thống: chỉ đổi tên và sắp xếp được, không ẩn, xóa hay đổi nhóm."


class IsActiveStaff(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and user.is_staff)


class PublicListsView(APIView):
    """GET (website): the lists the registration form and the learner's own file offer."""

    permission_classes = []
    authentication_classes = []

    def get(self, request):
        return Response(
            {
                "provinces": lists.values("province"),
                "educationLevels": lists.values("education_level"),
                "genders": lists.values("gender"),
                "universities": lists.values("university"),
            }
        )


class CrmListsView(APIView):
    """GET: every list's offered values (sources, provinces, schools, course categories…)."""

    permission_classes = [IsActiveStaff]

    def get(self, request):
        return Response(lists.all_lists())


def _kind(key: str) -> lists.Kind:
    if key not in lists.KIND:
        raise NotFound("Không có danh mục này.")
    return lists.KIND[key]


def _clean(value, kind: str) -> str:
    value = " ".join(str(value or "").split())
    if not value:
        raise ValidationError({"value": "Nhập giá trị."})
    longest = lists.max_length(kind)
    if len(value) > longest:
        raise ValidationError({"value": f"Tối đa {longest} ký tự (độ dài ô lưu giá trị này)."})
    return value


def _locked(item: ListItem) -> bool:
    return item.value in lists.LOCKED.get(item.kind, ())


def _system_stage(item: ListItem) -> bool:
    return item.kind == stages.KIND and item.code in stages.BUILTIN


def _group(value) -> str:
    group = str(value or "")
    if group not in stages.CUSTOM_GROUPS:
        raise ValidationError(
            {"group": "Chọn nhóm: " + ", ".join(stages.GROUPS[g] for g in stages.CUSTOM_GROUPS) + "."}
        )
    return group


def _kind_payload(kind: lists.Kind) -> dict:
    used = lists.usage(kind.key)
    items = list(ListItem.objects.filter(kind=kind.key).order_by("position", "value"))
    listed = {i.value for i in items}
    return {
        "key": kind.key,
        "label": kind.label,
        "group": kind.group,
        "hint": kind.hint,
        "maxLength": lists.max_length(kind.key),
        "coded": kind.coded,
        # The groups a value may have, the ones a new value may pick (the CRM stages).
        "groups": [{"key": k, "label": v} for k, v in stages.GROUPS.items()] if kind.coded else [],
        "customGroups": list(stages.CUSTOM_GROUPS) if kind.coded else [],
        "items": [
            {
                "id": i.id,
                "value": i.value,
                "active": i.is_active,
                "used": used.get(i.value, 0),
                "locked": _locked(i),
                **(
                    {"code": i.code, "group": stages.BUILTIN.get(i.code, i.group), "system": _system_stage(i)}
                    if kind.coded
                    else {}
                ),
            }
            for i in items
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
        value = _clean(request.data.get("value"), kind.key)
        item = ListItem.objects.filter(kind=kind.key, value=value).first()
        if item and item.is_active:
            raise ValidationError({"value": "Giá trị này đã có trong danh mục."})
        group = _group(request.data.get("group")) if kind.coded else ""
        if item:
            item.is_active = True
            item.save(update_fields=["is_active", "updated_at"])
        else:
            last = ListItem.objects.filter(kind=kind.key).aggregate(m=Max("position"))["m"]
            item = ListItem.objects.create(
                kind=kind.key,
                value=value,
                position=(last or 0) + 1,
                code=f"custom_{uuid.uuid4().hex[:8]}" if kind.coded else "",
                group=group,
            )
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
    PATCH {value?, active?, group?}: rename (the records that have the old value get the new one; renaming
    to a value already in the list merges the two; a CRM stage changes no record) and / or hide / show, and a
    stage added in the list its group. DELETE: only a value no record has.
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
        renaming = (
            "value" in request.data and " ".join(str(request.data["value"] or "").split()) != item.value
        )
        hiding = "active" in request.data and not request.data.get("active")
        if _locked(item) and (renaming or hiding):
            raise ValidationError({"value": SYSTEM_VALUE})
        regrouping = "group" in request.data and request.data.get("group") != item.group
        if _system_stage(item) and (hiding or regrouping):
            raise ValidationError({"value": SYSTEM_STAGE})
        with transaction.atomic():
            if "value" in request.data:
                old, new = item.value, _clean(request.data.get("value"), item.kind)
                if new != old:
                    other = ListItem.objects.filter(kind=item.kind, value=new).exclude(pk=item.pk).first()
                    if other and kind.coded:
                        raise ValidationError({"value": "Đã có giai đoạn tên này."})
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
            if kind.coded and regrouping:
                old_group, item.group = item.group, _group(request.data.get("group"))
                item.save(update_fields=["group", "updated_at"])
                audit(request, "lists.regroup", item, value=item.value, old=old_group, new=item.group)
            if "active" in request.data:
                item.is_active = bool(request.data.get("active"))
                item.save(update_fields=["is_active", "updated_at"])
                audit(request, "lists.show" if item.is_active else "lists.hide", item, value=item.value)
        return Response({**_kind_payload(kind), "records": changed})

    def delete(self, request, pk):
        item = self._item(pk)
        if _locked(item):
            raise ValidationError({"value": SYSTEM_VALUE})
        if _system_stage(item):
            raise ValidationError({"value": SYSTEM_STAGE})
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
        if kind.coded:
            raise ValidationError({"from": "Giai đoạn được đổi trên từng đăng ký (kanban)."})
        old = str(request.data.get("from") or "")
        new = _clean(request.data.get("to"), kind.key)
        if not old or old == new:
            raise ValidationError({"from": "Chọn giá trị cần thay."})
        if not ListItem.objects.filter(kind=kind.key, value=new).exists():
            raise ValidationError({"to": "Chỉ thay bằng một giá trị có trong danh mục."})
        with transaction.atomic():
            changed = lists.replace_in_records(kind.key, old, new)
        audit(request, "lists.replace", None, kind=kind.key, old=old, new=new, records=changed)
        return Response({**_kind_payload(kind), "records": changed})
