import io
import ipaddress
import secrets
import socket
from urllib.parse import urljoin, urlsplit

import requests
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
MAX_FONT_BYTES = 10 * 1024 * 1024
FONT_SIGNATURES = {
    b"wOFF": ("woff", "font/woff"),
    b"wOF2": ("woff2", "font/woff2"),
    b"\x00\x01\x00\x00": ("ttf", "font/ttf"),
    b"OTTO": ("otf", "font/otf"),
}


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
        try:
            saved = store_image(upload)
        except ImageError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response({"url": default_storage.url(saved), "path": saved}, status=status.HTTP_201_CREATED)


class ImageError(ValueError):
    pass


def store_image(fileobj) -> str:
    """Decode, re-encode (drops EXIF and trailing data) and store an image in the public bucket."""
    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    try:
        with Image.open(fileobj) as img:
            img.verify()
        fileobj.seek(0)
        with Image.open(fileobj) as img:
            fmt = img.format
            if fmt not in FORMATS:
                raise UnidentifiedImageError(fmt)
            img.load()
            out = io.BytesIO()
            save_img = img.convert("RGB") if fmt == "JPEG" and img.mode not in ("RGB", "L") else img
            save_img.save(out, format=fmt, optimize=True)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ImageError("Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc ICO hợp lệ.") from exc
    ext, content_type = FORMATS[fmt]
    name = f"uploads/{timezone.now():%Y/%m}/{secrets.token_hex(12)}.{ext}"
    content = ContentFile(out.getvalue(), name=name)
    content.content_type = content_type
    return default_storage.save(name, content)


def _public_host(host: str) -> bool:
    """Every address the host resolves to is a public one (no localhost, LAN, Docker network, metadata)."""
    try:
        infos = socket.getaddrinfo(host, None)
    except (socket.gaierror, UnicodeError):
        return False
    return bool(infos) and all(ipaddress.ip_address(info[4][0].split("%")[0]).is_global for info in infos)


def fetch_remote_image(url: str) -> io.BytesIO:
    """
    Download an image from a public web address, for "copy to our storage". http(s) only, public hosts
    only (checked again on each redirect), size and time capped.
    """
    for _ in range(4):
        parts = urlsplit(url)
        if parts.scheme not in ("http", "https") or not parts.hostname:
            raise ImageError("Liên kết ảnh phải bắt đầu bằng http:// hoặc https://.")
        if not _public_host(parts.hostname):
            raise ImageError("Không tải được ảnh từ địa chỉ này.")
        try:
            res = requests.get(
                url,
                timeout=(5, 15),
                stream=True,
                allow_redirects=False,
                headers={"User-Agent": "Mozilla/5.0 (compatible; image-import)"},
            )
        except requests.RequestException as exc:
            raise ImageError("Không tải được ảnh (máy chủ ảnh không phản hồi).") from exc
        with res:
            if res.is_redirect:
                url = urljoin(url, res.headers.get("Location", ""))
                continue
            if res.status_code != 200:
                raise ImageError(f"Không tải được ảnh (mã {res.status_code}).")
            data = io.BytesIO()
            for chunk in res.iter_content(64 * 1024):
                data.write(chunk)
                if data.tell() > settings.MAX_UPLOAD_IMAGE_BYTES:
                    raise ImageError("Ảnh vượt quá dung lượng cho phép.")
            data.seek(0)
            return data
    raise ImageError("Liên kết ảnh chuyển hướng quá nhiều lần.")


class ImageImportView(APIView):
    """Copy an image found on another site into our storage (R2), so a page never depends on it."""

    permission_classes = ImageUploadView.permission_classes

    def get(self, request):
        """Where our images live (an image elsewhere in an article can be copied here)."""
        return Response({"base": default_storage.url("uploads/x.png").rsplit("uploads/x.png", 1)[0]})

    def post(self, request):
        url = str(request.data.get("url") or "").strip()
        if not url:
            return Response({"detail": "Thiếu liên kết ảnh."}, status=400)
        try:
            saved = store_image(fetch_remote_image(url))
        except ImageError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response({"url": default_storage.url(saved), "path": saved}, status=status.HTTP_201_CREATED)


class FontUploadView(APIView):
    """Store a validated web font for the global website typography setting."""

    parser_classes = [MultiPartParser]
    permission_classes = [require_perms("seo.settings")]

    def post(self, request):
        upload = request.FILES.get("file")
        if upload is None:
            return Response({"detail": "Thiếu tệp 'file'."}, status=400)
        if upload.size > MAX_FONT_BYTES:
            return Response({"detail": "Font vượt quá 10 MB."}, status=413)
        font_type = FONT_SIGNATURES.get(upload.read(4))
        upload.seek(0)
        if font_type is None:
            return Response({"detail": "Chỉ chấp nhận font WOFF, WOFF2, TTF hoặc OTF hợp lệ."}, status=400)
        ext, content_type = font_type
        name = f"uploads/fonts/{timezone.now():%Y/%m}/{secrets.token_hex(12)}.{ext}"
        content = ContentFile(upload.read(), name=name)
        content.content_type = content_type
        saved = default_storage.save(name, content)
        return Response({"url": default_storage.url(saved), "path": saved}, status=status.HTTP_201_CREATED)
