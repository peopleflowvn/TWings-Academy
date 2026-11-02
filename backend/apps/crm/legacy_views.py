from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import require_perms
from apps.core.models import audit

from .deletion import is_super_admin
from .legacy_import import LegacyImportError, run
from .lists import all_lists


class CrmListsView(APIView):
    """GET: the CRM's option lists (sources, interest levels, provinces, schools…) every /app form uses."""

    def get_permissions(self):
        return [require_perms("crm.view_leads")()]

    def get(self, request):
        return Response(all_lists())


class LegacyImportView(APIView):
    """
    POST file=<the old CRM .xlsx> [apply=1]: without apply, what the import would do (nothing written);
    with apply, the import. Super admin only (it writes hundreds of learners at once).
    """

    parser_classes = [MultiPartParser]

    def get_permissions(self):
        return [require_perms("crm.delete_lead")()]

    def post(self, request):
        if not is_super_admin(request.user):
            raise PermissionDenied("Chỉ super admin được nhập dữ liệu CRM cũ.")
        upload = request.FILES.get("file")
        if upload is None:
            raise ValidationError({"file": "Chọn file Excel CRM cũ (.xlsx)."})
        apply = str(request.data.get("apply", "")).lower() in ("1", "true", "yes")
        try:
            summary = run(upload, apply=apply, user=request.user)
        except LegacyImportError as exc:
            raise ValidationError({"file": str(exc)}) from exc
        if apply:
            audit(
                request,
                "crm.legacy_import",
                None,
                file=upload.name,
                registrations=summary["registrations"],
                classes=[c["code"] for c in summary["classes"]],
            )
        return Response(summary)
