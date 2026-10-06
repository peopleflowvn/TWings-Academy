"""
Learner account on the TWings site (/tai-khoan): sign in with a one-time code sent to the e-mail of an
order, then see orders, installments (with the VietQR for the next one), courses, progress and
certificates, and ask for a refund.

The session is the same one the SSO provider uses, so "Vào học" opens Moodle without a second code.
CSRF is enforced on every POST (the endpoints are anonymous, so DRF would not do it by itself).
"""

import time

from django.db.models import Prefetch
from rest_framework import serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.crm.models import Activity, FollowupTask, Order
from apps.payments.billing import order_billing

from . import services
from .views import LEARNER, _send_code

REFUND_TASK_PREFIX = "Yêu cầu hoàn tiền"


def learner_email(request) -> str | None:
    learner = request.session.get(LEARNER)
    if learner and time.time() - learner["at"] < services.LEARNER_SESSION_TTL:
        return learner["email"]
    return None


def _learner_orders(email: str):
    return (
        Order.objects.filter(customer_email__iexact=email, parent__isnull=True)
        .exclude(status="cancelled", total_paid_amount=0)
        .select_related(
            "cohort", "lms_enrollment", "lms_enrollment__certificate", "lms_enrollment__cohort", "review"
        )
        .prefetch_related(
            Prefetch(
                "components",
                queryset=Order.objects.select_related(
                    "cohort", "lms_enrollment", "lms_enrollment__certificate", "lms_enrollment__cohort"
                ),
            )
        )
        .order_by("-created_at")
    )


def _can_review(order: Order, enrollment) -> bool:
    return bool(order.course_id and order.learning_access and enrollment and enrollment.status == "done")


def _course_item(order: Order) -> dict:
    enrollment = getattr(order, "lms_enrollment", None)
    review = getattr(order, "review", None)
    certificate = getattr(enrollment, "certificate", None) if enrollment else None
    cohort = (enrollment.cohort if enrollment and enrollment.cohort_id else None) or order.cohort
    return {
        "title": order.course_title,
        "cohort_name": cohort.name if cohort else "",
        "start_date": cohort.start_date.isoformat() if cohort and cohort.start_date else None,
        "lms_status": enrollment.status if enrollment else None,
        "lms_status_label": enrollment.get_status_display() if enrollment else "",
        "progress": enrollment.progress if enrollment else None,
        "completed_at": enrollment.completed_at.isoformat()
        if enrollment and enrollment.completed_at
        else None,
        "certificate": (
            {"code": certificate.code, "url": f"/xac-minh/{certificate.code}/"}
            if certificate and not certificate.revoked
            else None
        ),
        "order_code": order.order_code,
        "can_review": _can_review(order, enrollment),
        "review": (
            {"rating": review.rating, "comment": review.comment, "status": review.status} if review else None
        ),
    }


def _order_item(order: Order) -> dict:
    billing = order_billing(order)
    courses = (
        [_course_item(c) for c in order.components.all()] if order.is_program_order else [_course_item(order)]
    )
    return {
        **billing,
        "title": order.course_title,
        "kind": "program" if order.is_program_order else "course",
        "created_at": order.created_at.isoformat(),
        "courses": courses,
        "refund_requested": order.followup_tasks.filter(
            title__startswith=REFUND_TASK_PREFIX, is_completed=False
        ).exists(),
    }


class _LearnerView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def initial(self, request, *args, **kwargs):
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            SessionAuthentication().enforce_csrf(request)
        super().initial(request, *args, **kwargs)


class AccountView(_LearnerView):
    def get(self, request):
        email = learner_email(request)
        if email is None:
            return Response({"authenticated": False})
        orders = list(_learner_orders(email))
        name = next((o.customer_name for o in orders if o.customer_name), "")
        return Response(
            {
                "authenticated": True,
                "email": email,
                "name": name,
                "learn_url": "/learn/",
                "orders": [_order_item(o) for o in orders],
            }
        )


class EmailSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)


class SendCodeView(_LearnerView):
    throttle_scope = "login"

    def post(self, request):
        ser = EmailSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = services.normalize_email(ser.validated_data["email"])
        ip = request.META.get("REMOTE_ADDR", "")
        if (
            services.allow(f"send:{email}", 1, 60)
            and services.allow(f"send-hour:{email}", 5, 3600)
            and services.allow(f"send-ip:{ip}", 20, 3600)
            and Order.objects.filter(customer_email__iexact=email, parent__isnull=True).exists()
        ):
            _send_code(email, services.issue_otp(email))
        # Same answer whether or not the e-mail is known: no account enumeration.
        return Response({"sent": True})


class VerifyCodeSerializer(EmailSerializer):
    code = serializers.RegexField(r"^\s*\d{6}\s*$")


class VerifyCodeView(_LearnerView):
    throttle_scope = "login"

    def post(self, request):
        ser = VerifyCodeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = services.normalize_email(ser.validated_data["email"])
        if not services.check_otp(email, ser.validated_data["code"]):
            return Response({"detail": "Mã không đúng hoặc đã hết hạn."}, status=400)
        request.session.cycle_key()  # new session id after authentication
        request.session[LEARNER] = {"email": email, "at": time.time()}
        return Response({"authenticated": True})


class LogoutView(_LearnerView):
    def post(self, request):
        request.session.pop(LEARNER, None)
        return Response({"authenticated": False})


class RefundRequestSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=1000)


class RefundRequestView(_LearnerView):
    """The learner asks for a refund: a high-priority follow-up for the admissions/finance team."""

    def post(self, request, order_code):
        email = learner_email(request)
        if email is None:
            return Response({"detail": "Vui lòng đăng nhập."}, status=401)
        order = Order.objects.filter(
            order_code=order_code.upper(), customer_email__iexact=email, parent__isnull=True
        ).first()
        if order is None:
            return Response({"detail": "Không tìm thấy đơn hàng."}, status=404)
        if order.total_paid_amount <= order.refunded_amount:
            return Response({"detail": "Đơn chưa có khoản thanh toán nào để hoàn."}, status=400)
        ser = RefundRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        reason = ser.validated_data["reason"].strip()
        if not order.followup_tasks.filter(title__startswith=REFUND_TASK_PREFIX, is_completed=False).exists():
            FollowupTask.objects.create(
                order=order, title=f"{REFUND_TASK_PREFIX} của học viên – xử lý trong 3 ngày", priority="high"
            )
        Activity.objects.create(
            order=order, type="note", title="Học viên gửi yêu cầu hoàn tiền", content=reason, actor=email
        )
        return Response(_order_item(order))


class ReviewSerializer(serializers.Serializer):
    order_code = serializers.CharField(max_length=20)
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(min_length=20, max_length=2000)
    display_name = serializers.CharField(max_length=100)
    role = serializers.CharField(max_length=150, required=False, allow_blank=True)
    consent = serializers.BooleanField()

    def validate_consent(self, value):
        if value is not True:
            raise serializers.ValidationError("Cần bạn đồng ý cho TWings đăng đánh giá lên website.")
        return value


class ReviewView(_LearnerView):
    """A learner reviews a course they study / studied; published after staff approval."""

    def post(self, request):
        from apps.catalog.models import CourseReview

        email = learner_email(request)
        if email is None:
            return Response({"detail": "Vui lòng đăng nhập."}, status=401)
        ser = ReviewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        order = (
            Order.objects.filter(order_code=data["order_code"].upper(), customer_email__iexact=email)
            .select_related("lms_enrollment")
            .first()
        )
        enrollment = getattr(order, "lms_enrollment", None) if order else None
        if order is None or not _can_review(order, enrollment):
            return Response({"detail": "Bạn chỉ đánh giá được khóa học mình đang / đã học."}, status=403)
        review, _ = CourseReview.objects.update_or_create(
            order=order,
            defaults={
                "course_id": order.course_id,
                "display_name": data["display_name"].strip(),
                "role": data.get("role", "").strip(),
                "rating": data["rating"],
                "comment": data["comment"].strip(),
                "completed": bool(enrollment.completed_at),
                "status": "pending",  # every edit goes through moderation again
            },
        )
        Activity.objects.create(
            order=order,
            type="note",
            title=f"Học viên gửi đánh giá {review.rating}★",
            content=review.comment[:500],
            actor=email,
        )
        return Response(_course_item(order))
