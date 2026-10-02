"""
Print fresh random secrets for a backend env file. Run locally or on the VPS; never commit the output.

    python backend/scripts/generate_secrets.py
"""

import base64
import secrets


def fernet_key() -> str:
    return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()


if __name__ == "__main__":
    print(f"DJANGO_SECRET_KEY={secrets.token_urlsafe(64)}")
    print(f"DJANGO_ADMIN_URL=ops-{secrets.token_hex(6)}/")
    print(f"FIELD_ENCRYPTION_KEYS={fernet_key()}")
    print(f"BLIND_INDEX_KEY={secrets.token_urlsafe(48)}")
    print(f"BANK_WEBHOOK_API_KEY={secrets.token_urlsafe(32)}")
    print(f"POSTGRES_PASSWORD={secrets.token_urlsafe(32)}")
