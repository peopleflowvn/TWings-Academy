import secrets

from django.db import models


def new_id() -> str:
    """Opaque, non-sequential string id (frontend models use string ids; avoids enumeration)."""
    return secrets.token_hex(8)


class BaseModel(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=new_id, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SiteConfig(models.Model):
    """Keyed JSON documents edited from the CMS (homepage sections, site SEO settings...)."""

    KEY_HOMEPAGE_SECTIONS = "homepage_sections"
    KEY_SITE_SEO = "site_seo"
    KEY_JOURNEYS = "journeys"
    KEY_CHOICES = [
        (KEY_HOMEPAGE_SECTIONS, "Homepage sections"),
        (KEY_SITE_SEO, "Site SEO settings"),
        (KEY_JOURNEYS, "Automated journey e-mails"),
    ]

    key = models.CharField(primary_key=True, max_length=64, choices=KEY_CHOICES)
    data = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key


class AuditLog(models.Model):
    """Append-only trail of sensitive actions (exports, payment confirmations, role changes, deletions)."""

    at = models.DateTimeField(auto_now_add=True, db_index=True)
    actor = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL)
    actor_label = models.CharField(max_length=200, blank=True)
    action = models.CharField(max_length=64, db_index=True)
    object_type = models.CharField(max_length=64, blank=True)
    object_id = models.CharField(max_length=64, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-at"]

    def __str__(self):
        return f"{self.at:%Y-%m-%d %H:%M} {self.actor_label} {self.action}"


def audit(request, action: str, obj=None, **details) -> AuditLog:
    user = getattr(request, "user", None) if request is not None else None
    user = user if user is not None and getattr(user, "is_authenticated", False) else None
    return AuditLog.objects.create(
        actor=user,
        actor_label=(user.email if user else details.pop("actor_label", "system")),
        action=action,
        object_type=obj._meta.label if obj is not None else "",
        object_id=str(obj.pk) if obj is not None else "",
        ip=(request.META.get("REMOTE_ADDR") if request is not None else None),
        details=details,
    )
