"""
Download and decrypt the output of an Ops workflow run (see .github/workflows/ops.yml).

    python infra/ops/fetch_output.py <run-id>

Needs the GitHub CLI (logged in) and OPS_OUTPUT_KEY in the repo-root .env. Matches the runner's
`openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 -salt`.
"""

import hashlib
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

ROOT = Path(__file__).resolve().parents[2]


def output_key() -> bytes:
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        m = re.match(r"^OPS_OUTPUT_KEY=(.+)$", line.strip())
        if m:
            return m.group(1).encode()
    sys.exit("OPS_OUTPUT_KEY not found in .env")


def decrypt(blob: bytes, password: bytes) -> bytes:
    if not blob.startswith(b"Salted__"):
        sys.exit("not an openssl salted file")
    salt, data = blob[8:16], blob[16:]
    km = hashlib.pbkdf2_hmac("sha256", password, salt, 200000, 48)
    dec = Cipher(algorithms.AES(km[:32]), modes.CBC(km[32:])).decryptor()
    padded = dec.update(data) + dec.finalize()
    unpadder = padding.PKCS7(128).unpadder()
    return unpadder.update(padded) + unpadder.finalize()


def main() -> None:
    if len(sys.argv) != 2 or not sys.argv[1].isdigit():
        sys.exit(__doc__)
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            ["gh", "run", "download", sys.argv[1], "-n", "ops-output", "-D", tmp],
            check=True,
            cwd=ROOT,
        )
        blob = (Path(tmp) / "ops-output.enc").read_bytes()
    sys.stdout.buffer.write(decrypt(blob, output_key()))


if __name__ == "__main__":
    main()
