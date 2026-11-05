"""
Template rendering: the stored EmailTemplate, else the standard template (defaults.py).
Supports both {{variable}} and {variable} placeholder syntax safely.
"""

import re
from typing import Any

from .models import EmailTemplate

# E-mails that carry a credential (password-reset link, sign-in code). Their stored versions come from
# seed_content / Django admin only: the staff API refuses to change them, otherwise any account allowed
# to edit e-mail templates could send the link or code to itself (e.g. an <img> pointing to its server)
# and take over the super admin.
LOCKED_TEMPLATES = frozenset({"staff_password_reset", "auth_otp"})

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
    brand: str | None = None,
) -> tuple[str, str]:
    """
    (subject, body) of a template: the database version (edited in /app/content/email), else the
    standard one (defaults.py), else the caller's. Brand variables ({{site_name}}, {{hotline}},
    {{support_email}}...) are filled too; `context` wins over them.
    """
    from .config import global_context
    from .defaults import BY_CODE

    tmpl = EmailTemplate.objects.filter(code=code).first()
    standard = BY_CODE.get(code) or {}
    raw_subject = (tmpl and tmpl.subject) or standard.get("subject") or default_subject
    raw_body = (tmpl and tmpl.body) or standard.get("body") or default_body
    ctx = {**global_context(brand or standard.get("brand", "twings")), **context}
    return interpolate(raw_subject, ctx), interpolate(raw_body, ctx)
