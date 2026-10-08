import os

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User


class Command(BaseCommand):
    help = "Ensure default superuser/admin (tuyendung@tntalent.vn) exists and is configured."

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            default=os.getenv("CMS_ADMIN_EMAIL", "tuyendung@tntalent.vn"),
            help="Email of the admin user.",
        )
        parser.add_argument(
            "--password",
            default=os.getenv("CMS_ADMIN_INITIAL_PASSWORD", ""),
            help="Initial password if user is created or reset requested.",
        )
        parser.add_argument(
            "--name",
            default="Quản trị viên TWings",
            help="Display name for the admin user.",
        )
        parser.add_argument(
            "--reset-password",
            action="store_true",
            help="Force reset password to the specified password.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        password = options["password"]
        name = options["name"].strip()
        reset_pwd = options["reset_password"]

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "name": name,
                "role": "super_admin",
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )

        needs_save = False
        if not created:
            if not user.is_staff or not user.is_superuser or user.role != "super_admin" or not user.is_active:
                user.is_staff = True
                user.is_superuser = True
                user.role = "super_admin"
                user.is_active = True
                needs_save = True
            if not user.name:
                user.name = name
                needs_save = True

        if (created or reset_pwd) and password:
            user.set_password(password)
            needs_save = True

        if needs_save:
            user.save()

        action = "Created" if created else ("Updated password for" if reset_pwd else "Verified/Updated")
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} admin account '{email}' (role={user.role}, is_staff={user.is_staff})."
            )
        )
