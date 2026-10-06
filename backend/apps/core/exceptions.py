"""API errors: database protection (an object still used elsewhere) becomes a clear 400, not a 500."""

from django.db.models import ProtectedError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    if isinstance(exc, ProtectedError):
        used_by = sorted({obj._meta.verbose_name for obj in exc.protected_objects})
        return Response(
            {
                "detail": "Không xóa được vì dữ liệu đang được dùng ("
                + ", ".join(str(v) for v in used_by)
                + "). Hãy ngừng bán / ẩn thay vì xóa."
            },
            status=400,
        )
    return drf_exception_handler(exc, context)
