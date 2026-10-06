from rest_framework import serializers

from .models import User
from .rbac import PERMISSIONS, effective_permissions


class MeSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "name", "email", "role", "avatar", "phone", "status", "permissions", "last_login"]

    def get_permissions(self, obj):
        return sorted(effective_permissions(obj))

    def get_status(self, obj):
        return "active" if obj.is_active else "suspended"


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False, max_length=256)


class StaffUserSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    status = serializers.ChoiceField(
        choices=["active", "suspended"], source="is_active_label", required=False
    )
    password = serializers.CharField(write_only=True, required=False, min_length=12, max_length=256)

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "role",
            "avatar",
            "phone",
            "status",
            "permissions",
            "permission_overrides",
            "receives_leads",
            "last_login",
            "date_joined",
            "password",
        ]
        read_only_fields = ["id", "last_login", "date_joined"]

    def get_permissions(self, obj):
        return sorted(effective_permissions(obj))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["status"] = "active" if instance.is_active else "suspended"
        return data

    def validate_permission_overrides(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Must be an object with 'granted'/'revoked' lists.")
        clean = {}
        for bucket in ("granted", "revoked"):
            codes = value.get(bucket, [])
            if not isinstance(codes, list) or any(c not in PERMISSIONS for c in codes):
                raise serializers.ValidationError(f"'{bucket}' must list known permission codes.")
            clean[bucket] = sorted(set(codes))
        return clean

    def _apply(self, instance, validated):
        status = validated.pop("is_active_label", None)
        password = validated.pop("password", None)
        for field, value in validated.items():
            setattr(instance, field, value)
        if status is not None:
            instance.is_active = status == "active"
        if password:
            from django.contrib.auth.password_validation import validate_password

            validate_password(password, instance)
            instance.set_password(password)
        instance.is_staff = True
        instance.full_clean(exclude=["password"])
        instance.save()
        return instance

    def create(self, validated_data):
        if not validated_data.get("password"):
            raise serializers.ValidationError({"password": "Bắt buộc khi tạo tài khoản."})
        return self._apply(User(), validated_data)

    def update(self, instance, validated_data):
        return self._apply(instance, validated_data)
