"""CMS (/app) endpoints for the Moodle LMS: learning overview per order and per course, staff actions."""

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import require_perms
from apps.core.models import audit
from apps.crm.models import Activity, Order
from apps.notifications.resend import ResendError

from . import moodle, overview
from .emails import send_access_email
from .models import LmsEnrollment
from .services import process


class LmsUnavailable(APIException):
    status_code = 503
    default_detail = "LMS (Moodle) chưa được cấu hình."


class _LmsView(APIView):
    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not moodle.is_configured():
            raise LmsUnavailable()

    def handle_exception(self, exc):
        if isinstance(exc, moodle.MoodleError):
            return Response({"detail": f"Không lấy được dữ liệu từ Moodle: {exc}"}, status=502)
        return super().handle_exception(exc)


def _enrollment_data(enrollment: LmsEnrollment | None) -> dict | None:
    if enrollment is None:
        return None
    return {
        "status": enrollment.status,
        "statusLabel": enrollment.get_status_display(),
        "lastError": enrollment.last_error,
        "attempts": enrollment.attempts,
        "moodleUserId": enrollment.moodle_user_id,
        "moodleCourseId": enrollment.moodle_course_id,
        "enrolledAt": enrollment.enrolled_at,
        "accessEmailedAt": enrollment.access_emailed_at,
    }


def _order_learning(order: Order) -> dict:
    return {
        "orderId": order.id,
        "paid": order.status == "paid",
        "email": order.customer_email,
        "enrollment": _enrollment_data(LmsEnrollment.objects.filter(order=order).first()),
        **overview.learner_overview(order.customer_email),
    }


class OrderLearningView(_LmsView):
    """Learning status of the order's learner: enrolment record + live Moodle account and courses."""

    permission_classes = [require_perms("lms.view")]

    def get(self, request, pk):
        return Response(_order_learning(get_object_or_404(Order, pk=pk)))


class OrderLearningActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(["enroll", "unenroll", "suspend", "unsuspend", "send_access_email"])


ACTION_TITLES = {
    "enroll": "Ghi danh (lại) vào LMS",
    "unenroll": "Hủy ghi danh khỏi khóa trên LMS",
    "suspend": "Tạm khóa tài khoản LMS",
    "unsuspend": "Mở khóa tài khoản LMS",
    "send_access_email": "Gửi email hướng dẫn vào học",
}


class OrderLearningActionView(_LmsView):
    permission_classes = [require_perms("lms.manage")]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        ser = OrderLearningActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        action = ser.validated_data["action"]
        if not order.customer_email:
            raise serializers.ValidationError({"detail": "Đơn chưa có email học viên."})
        enrollment = LmsEnrollment.objects.filter(order=order).first()

        if action == "enroll":
            if order.status != "paid":
                raise serializers.ValidationError({"detail": "Chỉ ghi danh đơn đã thanh toán."})
            enrollment = enrollment or LmsEnrollment.objects.create(order=order)
            enrollment.status = "pending"
            process(enrollment)
            if enrollment.status != "done":
                raise serializers.ValidationError({"detail": enrollment.last_error or "Ghi danh thất bại."})
        elif action == "unenroll":
            if not (enrollment and enrollment.moodle_user_id and enrollment.moodle_course_id):
                raise serializers.ValidationError({"detail": "Đơn này chưa được ghi danh trên LMS."})
            overview.unenrol(enrollment.moodle_user_id, enrollment.moodle_course_id)
            enrollment.status = "removed"
            enrollment.save(update_fields=["status", "updated_at"])
        elif action in ("suspend", "unsuspend"):
            user = overview.find_user(order.customer_email)
            if user is None:
                raise serializers.ValidationError({"detail": "Học viên chưa có tài khoản LMS."})
            overview.set_suspended(user["id"], action == "suspend")
        else:  # send_access_email
            try:
                send_access_email(order, sent_by=request.user)
            except ResendError as exc:
                return Response({"detail": f"Gửi email thất bại: {exc}"}, status=502)
            if enrollment:
                enrollment.access_emailed_at = timezone.now()
                enrollment.save(update_fields=["access_emailed_at", "updated_at"])

        audit(request, f"lms.{action}", order, order_code=order.order_code)
        Activity.objects.create(
            order=order,
            type="email" if action == "send_access_email" else "note",
            title=ACTION_TITLES[action],
            actor=request.user.name or request.user.email,
            actor_user=request.user,
        )
        return Response(_order_learning(order), status=status.HTTP_200_OK)


class CourseCatalogView(_LmsView):
    """Every TWings course, its Moodle course (if any), paid orders vs. students on Moodle."""

    permission_classes = [require_perms("lms.view")]

    def get(self, request):
        return Response(overview.course_catalog())


class CourseLearnersView(_LmsView):
    permission_classes = [require_perms("lms.view")]

    def get(self, request, moodle_course_id: int):
        return Response(overview.course_learners(moodle_course_id))


class OpenMoodleView(_LmsView):
    """Prepare the staff member's Moodle account (and manager role for training staff) before opening it."""

    permission_classes = [require_perms("lms.view")]

    def post(self, request):
        result = overview.ensure_staff_access(request.user)
        audit(request, "lms.open", None, manager=result["manager"])
        return Response(result)
