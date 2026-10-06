import io
import secrets

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone
from PIL import Image, UnidentifiedImageError
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import require_perms

FORMATS = {
    "JPEG": ("jpg", "image/jpeg"),
    "PNG": ("png", "image/png"),
    "WEBP": ("webp", "image/webp"),
    "ICO": ("ico", "image/x-icon"),  # favicons
}
MAX_PIXELS = 40_000_000  # decompression-bomb guard


class ImageUploadView(APIView):
    """
    Upload a CMS image to the public bucket. The file is decoded and re-encoded, which drops EXIF
    (GPS, device info) and anything smuggled after the image data. SVG is refused (can carry script).
    """

    parser_classes = [MultiPartParser]
    permission_classes = [
        require_perms(
            "courses.edit_info",
            "courses.instructors",
            "banner.carousel",
            "articles.create_edit",
            "homepage.intro_about",
            "homepage.partners",
            "seo.settings",
        )
    ]

    def post(self, request):
        upload = request.FILES.get("file")
        if upload is None:
            return Response({"detail": "Thiếu tệp 'file'."}, status=400)
        if upload.size > settings.MAX_UPLOAD_IMAGE_BYTES:
            return Response({"detail": "Ảnh vượt quá dung lượng cho phép."}, status=413)

        Image.MAX_IMAGE_PIXELS = MAX_PIXELS
        try:
            with Image.open(upload) as img:
                img.verify()
            upload.seek(0)
            with Image.open(upload) as img:
                fmt = img.format
                if fmt not in FORMATS:
                    raise UnidentifiedImageError(fmt)
                img.load()
                out = io.BytesIO()
                save_img = img.convert("RGB") if fmt == "JPEG" and img.mode not in ("RGB", "L") else img
                save_img.save(out, format=fmt, optimize=True)
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
            return Response({"detail": "Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc ICO hợp lệ."}, status=400)

        ext, content_type = FORMATS[fmt]
        name = f"uploads/{timezone.now():%Y/%m}/{secrets.token_hex(12)}.{ext}"
        content = ContentFile(out.getvalue(), name=name)
        content.content_type = content_type
        saved = default_storage.save(name, content)
        return Response({"url": default_storage.url(saved), "path": saved}, status=status.HTTP_201_CREATED)
