"""
Moodle -> TWings: local_twings (lms/public/local/twings) posts learning events (course completed, user
graded, attendance taken) right after they happen, signed with HMAC-SHA256. The key is derived from the
web service token both sides already share, so there is no extra secret to distribute.
"""

import hashlib
import hmac
import json
import logging
import time

from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.queue import enqueue_once

from . import tasks

logger = logging.getLogger(__name__)

MAX_AGE = 600  # seconds: a captured request cannot be replayed later


def signing_key() -> bytes:
    return hashlib.sha256(b"twings-lms-events:" + settings.MOODLE_WS_TOKEN.encode()).digest()


def signature(body: bytes) -> str:
    return hmac.new(signing_key(), body, hashlib.sha256).hexdigest()


class MoodleEventView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "webhook"

    def post(self, request):
        if not settings.MOODLE_WS_TOKEN:
            return Response(status=503)
        body = request.body
        if not hmac.compare_digest(request.headers.get("X-TWings-Signature", ""), signature(body)):
            logger.warning(
                "Rejected Moodle event with a bad signature from %s", request.META.get("REMOTE_ADDR")
            )
            return Response(status=403)
        try:
            event = json.loads(body)
            course_id, user_id, sent_at = int(event["courseid"]), int(event["userid"]), int(event["ts"])
        except (ValueError, KeyError, TypeError):
            return Response({"detail": "bad payload"}, status=400)
        if abs(time.time() - sent_at) > MAX_AGE:
            return Response({"detail": "stale"}, status=403)
        enqueue_once(tasks.moodle_event, course_id, user_id)
        return Response({"queued": True}, status=202)
