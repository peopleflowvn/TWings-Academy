from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
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


def _check_new_password(password, user):
    try:
        validate_password(password, user)
    except DjangoValidationError as e:
        raise serializers.ValidationError({"new_password": list(e.messages)}) from e


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(trim_whitespace=False, max_length=256)
    new_password = serializers.CharField(trim_whitespace=False, min_length=12, max_length=256)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError({"current_password": "Mật khẩu hiện tại không đúng."})
        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError({"new_password": "Mật khẩu mới phải khác mật khẩu hiện tại."})
        _check_new_password(attrs["new_password"], user)
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(max_length=128)
    token = serializers.CharField(max_length=128)
    new_password = serializers.CharField(trim_whitespace=False, min_length=12, max_length=256)

    def validate(self, attrs):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_str
        from django.utils.http import urlsafe_base64_decode

        invalid = serializers.ValidationError(
            "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới."
        )
        try:
            pk = force_str(urlsafe_base64_decode(attrs["uid"]))
            user = User.objects.get(pk=pk, is_active=True, is_staff=True)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            raise invalid from None
        if not default_token_generator.check_token(user, attrs["token"]):
            raise invalid
        _check_new_password(attrs["new_password"], user)
        attrs["user"] = user
        return attrs


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

    def validate_email(self, value):
        email = value.strip().lower()
        taken = User.objects.filter(email__iexact=email)
        if self.instance is not None:
            taken = taken.exclude(pk=self.instance.pk)
        if taken.exists():
            raise serializers.ValidationError("Email này đã có tài khoản.")
        return email

    def validate(self, attrs):
        password = attrs.get("password")
        if self.instance is None and not password:
            raise serializers.ValidationError({"password": "Bắt buộc khi tạo tài khoản."})
        if password:
            # Similarity check needs the final email/name, so judge against an unsaved copy.
            probe = User(
                email=attrs.get("email", getattr(self.instance, "email", "")),
                name=attrs.get("name", getattr(self.instance, "name", "")),
            )
            try:
                validate_password(password, probe)
            except DjangoValidationError as e:
                raise serializers.ValidationError({"password": list(e.messages)}) from e
        return attrs

    def _apply(self, instance, validated):
        status = validated.pop("is_active_label", None)
        password = validated.pop("password", None)
        for field, value in validated.items():
            setattr(instance, field, value)
        if status is not None:
            instance.is_active = status == "active"
        if password:
            instance.set_password(password)
        instance.is_staff = True
        try:
            instance.full_clean(exclude=["password"])
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.message_dict) from e
        instance.save()
        return instance

    def create(self, validated_data):
        return self._apply(User(), validated_data)

    def update(self, instance, validated_data):
        return self._apply(instance, validated_data)
