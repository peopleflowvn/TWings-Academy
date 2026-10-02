import hmac
import logging

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.parsers import JSONParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import ActionPermission, require_perms
from apps.crm.models import Order
from apps.crm.serializers import PublicRegistrationSerializer
from apps.crm.services import CheckoutError, create_public_order

from .models import BankTransaction
from .services import confirm_manual_payment, ingest_bank_transaction, vietqr_payload

logger = logging.getLogger(__name__)


class PublicCheckoutView(APIView):
    """Create an order priced server-side and return VietQR transfer instructions."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "public_form"

    def post(self, request):
        if not settings.VIETQR_ACCOUNT_NUMBER:
            return Response({"detail": "Thanh toán trực tuyến tạm thời chưa mở."}, status=503)
        ser = PublicRegistrationSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        if ser.validated_data.get("website"):
            return Response({"detail": "Yêu cầu không hợp lệ."}, status=400)
        try:
            order = create_public_order(dict(ser.validated_data), ser.consent_fields(), with_payment=True)
        except CheckoutError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(
            {
                **vietqr_payload(order),
                "course_title": order.course_title,
                "original_amount": order.original_amount,
                "discount_amount": order.discount_amount,
                "status": order.status,
            },
            status=status.HTTP_201_CREATED,
        )


class PublicOrderStatusView(APIView):
    """Polled by the checkout screen. Reveals only the payment status of an unguessable order code."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, order_code):
        order = get_object_or_404(Order, order_code=order_code.upper())
        return Response({"order_code": order.order_code, "status": order.status, "amount": order.amount})


class BankWebhookView(APIView):
    """
    Incoming-transfer notifications (SePay format; header "Authorization: Apikey <BANK_WEBHOOK_API_KEY>").
    Idempotent: retries of the same transaction are acknowledged without crediting twice.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    parser_classes = [JSONParser]  # keep the provider's original keys
    throttle_scope = "webhook"

    def post(self, request):
        expected = settings.BANK_WEBHOOK_API_KEY
        if not expected:
            return Response({"success": False, "detail": "Webhook disabled"}, status=503)
        provided = request.headers.get("Authorization", "")
        if not hmac.compare_digest(provided.encode(), f"Apikey {expected}".encode()):
            logger.warning(
                "Rejected bank webhook with invalid credentials from %s", request.META.get("REMOTE_ADDR")
            )
            return Response({"success": False}, status=401)
        payload = request.data if isinstance(request.data, dict) else {}
        try:
            txn, created = ingest_bank_transaction(payload)
        except (ValueError, TypeError) as exc:
            return Response({"success": False, "detail": str(exc)}, status=400)
        return Response({"success": True, "duplicate": not created, "match_status": txn.match_status})


class BankTransactionSerializer(serializers.ModelSerializer):
    order_code = serializers.CharField(source="order.order_code", read_only=True, default="")

    class Meta:
        model = BankTransaction
        exclude = ["raw"]


class BankTransactionViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = BankTransactionSerializer
    permission_classes = [ActionPermission]
    permission_map = {"list": ["finance.transactions"], "retrieve": ["finance.transactions"]}
    filterset_fields = ["match_status"]
    search_fields = ["content", "reference_code", "order__order_code"]
    queryset = BankTransaction.objects.select_related("order")


class ManualPaymentSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=1)
    note = serializers.CharField(max_length=300)


class ConfirmManualPaymentView(APIView):
    permission_classes = [require_perms("finance.confirm_manual")]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        ser = ManualPaymentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        payment = confirm_manual_payment(
            request, order, ser.validated_data["amount"], ser.validated_data["note"]
        )
        order.refresh_from_db()
        return Response(
            {
                "payment_id": payment.pk,
                "order_status": order.status,
                "total_paid_amount": order.total_paid_amount,
            },
            status=201,
        )
