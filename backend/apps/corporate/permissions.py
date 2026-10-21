"""Which clients a staff member may see. Every corporate query goes through here (tenant scope)."""

from apps.accounts.rbac import has_perm_code

from .models import CorporateClient


def scoped_clients(user):
    """
    Phase 1: anyone with corporate.view sees every client (internal staff, like consultants seeing all
    leads). Narrowing to assigned clients later only changes this function.
    """
    if not has_perm_code(user, "corporate.view"):
        return CorporateClient.objects.none()
    return CorporateClient.objects.all()


def in_scope(user, client) -> bool:
    return client is not None and scoped_clients(user).filter(pk=client.pk).exists()
