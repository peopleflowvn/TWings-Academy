from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import require_perms

from .lists import all_lists


class CrmListsView(APIView):
    """GET: the CRM's option lists (sources, interest levels, provinces, schools…) every /app form uses."""

    def get_permissions(self):
        return [require_perms("crm.view_leads")()]

    def get(self, request):
        return Response(all_lists())
