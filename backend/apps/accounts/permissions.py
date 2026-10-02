from rest_framework.permissions import BasePermission

from .rbac import has_perm_code


class ActionPermission(BasePermission):
    """
    Maps each viewset action to the permission codes it needs (any one suffices):

        permission_map = {"list": ["crm.view_leads"], "partial_update": ["crm.edit_status"]}

    Actions missing from the map are denied, so a new endpoint is closed until someone opts it in.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.is_active and user.is_staff):
            return False
        action = getattr(view, "action", None) or request.method.lower()
        required = getattr(view, "permission_map", {}).get(action)
        if required is None:
            return False
        return any(has_perm_code(user, code) for code in required)


def require_perms(*codes):
    """Permission class for function-based or single-purpose views."""

    class _RequirePerms(BasePermission):
        def has_permission(self, request, view):
            user = request.user
            if not (user and user.is_authenticated and user.is_active and user.is_staff):
                return False
            return any(has_perm_code(user, c) for c in codes)

    _RequirePerms.__name__ = f"RequirePerms({','.join(codes)})"
    return _RequirePerms
