"""
Render the VPS env files (/opt/twings/env/*.env) from the production section of the repo-root .env.

Keys named PROD_<FILE>__<VAR> become <VAR>=... in <file>.env, e.g. PROD_DB__POSTGRES_PASSWORD -> db.env.

    python infra/vps/render_env.py <out-dir>          # e.g. a temp folder, never inside the repo
    scp -i <admin-key> <out-dir>/*.env ubuntu@<vps-ip>:/tmp/twings-env/
    ssh ... 'sudo install -m 600 -o root -g root /tmp/twings-env/*.env /opt/twings/env/ && rm -rf /tmp/twings-env'
"""

import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
KEY = re.compile(r"^PROD_([A-Z0-9]+)__([A-Z0-9_]+)=(.*)$")


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    out = Path(sys.argv[1]).resolve()
    if ROOT_ENV.parent in (out, *out.parents):
        print("refusing to write secrets inside the repository", file=sys.stderr)
        return 2

    files: dict[str, list[str]] = defaultdict(list)
    empty = []
    for line in ROOT_ENV.read_text(encoding="utf-8").splitlines():
        m = KEY.match(line.strip())
        if m:
            name, var, value = m.group(1).lower(), m.group(2), m.group(3)
            files[name].append(f"{var}={value}")
            if not value:
                empty.append(f"{name}.env: {var}")

    out.mkdir(parents=True, exist_ok=True)
    for name, lines in files.items():
        (out / f"{name}.env").write_text(
            "\n".join(lines) + "\n", encoding="utf-8", newline="\n"
        )
        print(f"wrote {name}.env ({len(lines)} vars)")
    if empty:
        print(
            "\nstill empty (R2/Resend optional; VIETQR_ACCOUNT_NUMBER needed for payments):",
            *empty,
            sep="\n  ",
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
