"""
Field-level encryption and blind indexes for personal data (Nghị định 13/2023/NĐ-CP).

- EncryptedTextField stores Fernet ciphertext (AES-128-CBC + HMAC-SHA256). A database dump alone
  does not reveal CCCD numbers, home addresses or bank accounts.
- blind_index() gives a keyed, deterministic hash so encrypted values can still be matched
  (e.g. duplicate CCCD detection) without decrypting every row.
"""

import hashlib
import hmac
import unicodedata
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from django.conf import settings
from django.db import models

ENCRYPTED_PREFIX = "enc1:"


@lru_cache(maxsize=1)
def _fernet() -> MultiFernet:
    keys = [k.strip() for k in settings.FIELD_ENCRYPTION_KEYS if k.strip()]
    if not keys:
        raise RuntimeError("FIELD_ENCRYPTION_KEYS is empty")
    return MultiFernet([Fernet(k.encode()) for k in keys])


def encrypt_str(value: str) -> str:
    return ENCRYPTED_PREFIX + _fernet().encrypt(value.encode()).decode()


def decrypt_str(value: str) -> str:
    if not value.startswith(ENCRYPTED_PREFIX):
        return value  # legacy plaintext; re-encrypted on next save
    try:
        return _fernet().decrypt(value[len(ENCRYPTED_PREFIX) :].encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Cannot decrypt field: wrong FIELD_ENCRYPTION_KEYS?") from exc


def normalize_for_index(value: str) -> str:
    value = unicodedata.normalize("NFKC", value or "").strip().lower()
    return "".join(value.split())


def blind_index(value: str) -> str:
    normalized = normalize_for_index(value)
    if not normalized:
        return ""
    return hmac.new(settings.BLIND_INDEX_KEY.encode(), normalized.encode(), hashlib.sha256).hexdigest()


class EncryptedTextField(models.TextField):
    """Transparently encrypted text. Not searchable: pair with a blind index field when lookup is needed."""

    def from_db_value(self, value, expression, connection):
        if value in (None, ""):
            return value
        return decrypt_str(value)

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value in (None, ""):
            return value
        return encrypt_str(str(value))
