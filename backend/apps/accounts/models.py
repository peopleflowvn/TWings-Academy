from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.core.models import new_id

from .rbac import PERMISSIONS, Role


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError("Email is required")
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_password(password)
        user.full_clean(exclude=["password"])
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.update(is_staff=True, is_superuser=True, role=Role.SUPER_ADMIN)
        return self._create_user(email, password, **extra)


class User(AbstractUser):
    """Staff account. Learners/applicants are CRM records, not users, so they have no login surface."""

    id = models.CharField(primary_key=True, max_length=64, default=new_id, editable=False)
    username = None
    first_name = None
    last_name = None
    email = models.EmailField("email", unique=True)
    name = models.CharField(max_length=150)
    role = models.CharField(max_length=32, choices=Role.CHOICES, default=Role.SALES_CRM)
    phone = models.CharField(max_length=32, blank=True)
    avatar = models.URLField(max_length=500, blank=True)
    # {"granted": ["crm.export_excel"], "revoked": ["crm.delete_lead"]}
    permission_overrides = models.JSONField(default=dict, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    objects = UserManager()

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} <{self.email}>"

    def clean(self):
        super().clean()
        overrides = self.permission_overrides or {}
        for bucket in ("granted", "revoked"):
            unknown = set(overrides.get(bucket, [])) - set(PERMISSIONS)
            if unknown:
                from django.core.exceptions import ValidationError

                raise ValidationError(
                    {"permission_overrides": f"Unknown permission codes: {sorted(unknown)}"}
                )
