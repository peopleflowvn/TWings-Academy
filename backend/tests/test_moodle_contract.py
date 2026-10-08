"""The backend only calls Moodle web service functions that twings_setup.php enables for its token."""

import re
from pathlib import Path

from apps.lms.moodle import functions_used

SETUP = Path(__file__).resolve().parents[2] / "infra" / "lms" / "twings_setup.php"


def enabled_functions() -> set[str]:
    php = SETUP.read_text(encoding="utf-8")
    block = php[php.index("$functions = [") : php.index("];", php.index("$functions = ["))]
    return set(re.findall(r"'([a-z0-9_]+)'", block))


def test_every_function_the_backend_calls_is_enabled_in_moodle():
    used = functions_used()
    assert {"enrol_manual_enrol_users", "core_user_create_users", "mod_forum_get_forums_by_courses"} <= used
    assert not used - enabled_functions(), "add these to $functions in infra/lms/twings_setup.php"
