"""
Push secrets and variables from the repo-root .env to GitHub (environments "ops" and "production").
Values are passed to `gh` on stdin and never printed. Empty values are skipped and listed.

    python infra/ops/sync_github.py

Re-run after changing .env; then trigger the Ops workflow task "sync-env" to update the VPS.
"""

import base64
import io
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "infra" / "vps"))
import render_env


def gh_exe() -> str:
    """gh on PATH, else the per-user portable install (%LOCALAPPDATA%/Programs/gh)."""
    found = shutil.which("gh")
    if found:
        return found
    local = (
        Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "gh" / "bin" / "gh.exe"
    )
    if local.is_file():
        return str(local)
    sys.exit("GitHub CLI (gh) not found")


def read_env() -> dict[str, str]:
    out = {}
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        m = re.match(r"^([A-Z0-9_]+)=(.*)$", line.strip())
        if m:
            out[m.group(1)] = m.group(2).strip().strip('"')
    return out


def env_bundle() -> str:
    """tar.gz of the rendered /opt/twings/env/*.env files, base64-encoded."""
    with tempfile.TemporaryDirectory() as tmp:
        sys.argv = ["render_env.py", tmp]
        render_env.main()
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w:gz") as tar:
            for f in sorted(Path(tmp).glob("*.env")):
                tar.add(f, arcname=f.name)
    return base64.b64encode(buf.getvalue()).decode()


def gh(*args: str, value: str) -> None:
    subprocess.run(
        [gh_exe(), *args],
        input=value.encode(),
        check=True,
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
    )


def main() -> None:
    e = read_env()
    read = lambda p: Path(p).read_text(encoding="utf-8").strip() + "\n"
    # Ops tasks reach the machine named by ACTIVE_VPS (CORE / TA ...): <NAME>_ORACLE_HOST, <NAME>_SSH_KEY_PATH,
    # <NAME>_KNOWN_HOSTS (pinned host key; empty = the next ops run scans and prints it to pin).
    active = e.get("ACTIVE_VPS", "CORE").upper()
    secrets = {
        "ops": {
            "VPS_HOST": e.get(f"{active}_ORACLE_HOST", ""),
            "VPS_ADMIN_SSH_KEY": read(e[f"{active}_SSH_KEY_PATH"]),
            "VPS_KNOWN_HOSTS": e.get(f"{active}_KNOWN_HOSTS", ""),
            "OPS_OUTPUT_KEY": e.get("OPS_OUTPUT_KEY", ""),
            "VPS_ENV_BUNDLE": env_bundle(),
        },
        "production": {
            "VPS_HOST": e.get("GH_VPS_HOST", ""),
            "VPS_DEPLOY_SSH_KEY": read(ROOT / ".secrets" / "ci-deploy"),
            "VPS_KNOWN_HOSTS": e.get("GH_VPS_KNOWN_HOSTS", ""),
            "CLOUDFLARE_ACCOUNT_ID": e.get("GH_CLOUDFLARE_ACCOUNT_ID", ""),
            "CLOUDFLARE_PAGES_API_TOKEN": e.get("GH_CLOUDFLARE_PAGES_API_TOKEN", ""),
        },
    }
    variables = {
        "API_BASE_URL": e.get("GH_VAR_API_BASE_URL", ""),
        "CF_PAGES_PROJECT": e.get("GH_VAR_CF_PAGES_PROJECT", ""),
        "CI_DEPLOY_PUBKEY": read(ROOT / ".secrets" / "ci-deploy.pub").strip(),
    }

    skipped = []
    for environment, items in secrets.items():
        for name, value in items.items():
            if value.strip():
                gh("secret", "set", name, "--env", environment, value=value)
                print(f"secret  {environment}/{name}")
            elif name == "VPS_KNOWN_HOSTS":
                # New machine: drop the old pin so the next ops run scans (and prints) the new host key.
                subprocess.run([gh_exe(), "secret", "delete", name, "--env", environment], cwd=ROOT,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                print(f"deleted {environment}/{name} (host key will be scanned on the next ops run)")
            else:
                skipped.append(f"{environment}/{name}")
    for name, value in variables.items():
        if value:
            gh("variable", "set", name, value=value)
            print(f"variable {name}")
        else:
            skipped.append(f"variable {name}")
    if skipped:
        print("\nskipped (empty in .env):", *skipped, sep="\n  ")


if __name__ == "__main__":
    main()
