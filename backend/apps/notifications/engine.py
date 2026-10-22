"""
Unified template rendering engine: loads EmailTemplate from database or falls back to hardcoded defaults.
Supports both {{variable}} and {variable} placeholder syntax safely.
"""

import re
from typing import Any

from .models import EmailTemplate

VARIABLE_PATTERN = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\{([a-zA-Z0-9_]+)\}")


def to_snake(s: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", s).lower()


def to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


def interpolate(template_str: str, context: dict[str, Any]) -> str:
    """
    Safely replace {{key}} or {key} in template_str with str(context[key]).
    Supports both camelCase and snake_case interchangeable lookups.
    """
    if not template_str:
        return ""

    def _replace(match: re.Match) -> str:
        key = match.group(1) or match.group(2)
        snake = to_snake(key)
        camel = to_camel(key)

        if key in context:
            val = context[key]
        elif snake in context:
            val = context[snake]
        elif camel in context:
            val = context[camel]
        else:
            return match.group(0)

        return str(val) if val is not None else ""

    return VARIABLE_PATTERN.sub(_replace, template_str)


def render_template(
    code: str,
    context: dict[str, Any],
    default_subject: str = "",
    default_body: str = "",
) -> tuple[str, str]:
    """
    Look up EmailTemplate by code in the database.
    If found and active, renders its subject and body with `context`.
    If not found, falls back to `default_subject` and `default_body`.
    Returns (rendered_subject, rendered_body).
    """
    tmpl = EmailTemplate.objects.filter(code=code).first()
    raw_subject = tmpl.subject if tmpl and tmpl.subject else default_subject
    raw_body = tmpl.body if tmpl and tmpl.body else default_body

    rendered_subject = interpolate(raw_subject, context)
    rendered_body = interpolate(raw_body, context)
    return rendered_subject, rendered_body
