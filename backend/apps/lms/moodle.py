"""
Minimal client for Moodle's REST web services.

Moodle is reached on the internal Docker network only (MOODLE_INTERNAL_URL, e.g. http://lms:8080/learn);
the public site blocks /learn/webservice/, so the token is useless from the internet even if leaked.
"""

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class MoodleError(Exception):
    pass


def is_configured() -> bool:
    return bool(settings.MOODLE_INTERNAL_URL and settings.MOODLE_WS_TOKEN)


def _flatten(prefix: str, value, out: dict) -> None:
    """Moodle's REST format wants PHP-style keys: users[0][email]=..."""
    if isinstance(value, dict):
        for k, v in value.items():
            _flatten(f"{prefix}[{k}]" if prefix else k, v, out)
    elif isinstance(value, (list, tuple)):
        for i, v in enumerate(value):
            _flatten(f"{prefix}[{i}]", v, out)
    elif isinstance(value, bool):
        out[prefix] = int(value)
    elif value is not None:
        out[prefix] = value


def call(function: str, **params):
    data: dict = {}
    _flatten("", params, data)
    data.update(wstoken=settings.MOODLE_WS_TOKEN, wsfunction=function, moodlewsrestformat="json")
    url = f"{settings.MOODLE_INTERNAL_URL.rstrip('/')}/webservice/rest/server.php"
    try:
        # Moodle only answers for its configured site hostname, so present the public Host header.
        headers = {"Host": settings.MOODLE_HOST} if settings.MOODLE_HOST else {}
        response = requests.post(url, data=data, headers=headers, timeout=20)
    except requests.RequestException as exc:
        raise MoodleError(f"Không kết nối được Moodle: {exc.__class__.__name__}") from exc
    if response.status_code >= 400:
        raise MoodleError(f"Moodle trả lỗi HTTP {response.status_code}")
    try:
        body = response.json()
    except ValueError as exc:
        raise MoodleError("Moodle trả về dữ liệu không phải JSON") from exc
    if isinstance(body, dict) and body.get("exception"):
        # errorcode/message never contain the token.
        raise MoodleError(f"{function}: {body.get('errorcode')}: {body.get('message')}")
    return body
