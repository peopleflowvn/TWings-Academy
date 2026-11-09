"""
Is this the same person? Matching a registration to a learner, and spotting two learner records that
may be one person.

Signals, each normalised first:
- e-mail: case, spaces, Gmail dots and "+tag", googlemail.com (a typo in the domain, gmai.com,
  gmail.con…, is only a possible match: mail.com and ymail.com are real);
- phone: digits, +84 / 84 as 0 (learners.phone_key);
- CCCD: its blind index;
- name: without accents, đ as d, case and extra spaces ignored; "Duyên", "Duyen Nguyen" and
  "Nguyễn Bích Duyên" are compatible, "Nguyễn Văn An" and "Trần Thị Bình" are not;
- birth date.

Decision:
    SURE      CCCD; or e-mail / phone with a compatible name (or no name to compare)
              -> the registration joins that learner.
    POSSIBLE  e-mail / phone with another name (a parent's phone, a shared mailbox), or the same name
              with a near phone (one digit off / swapped), a near e-mail, the same mailbox on a mistyped
              domain or the same birth date
              -> a new learner, and the pair is kept for staff to decide (LearnerMatch: same person ->
              merge, other person -> dismissed for good).
"""

import re
import unicodedata
from difflib import SequenceMatcher

from django.db.models import Q

GMAIL = {"gmail.com", "googlemail.com"}


def distance(a: str, b: str, limit: int = 3) -> int:
    """Edit distance (insert, delete, replace, swap of neighbours), stops counting past `limit`."""
    if abs(len(a) - len(b)) > limit:
        return limit + 1
    prev2, prev = None, list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i] + [0] * len(b)
        for j, cb in enumerate(b, 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb))
            if prev2 is not None and i > 1 and j > 1 and ca == b[j - 2] and a[i - 2] == cb:
                cur[j] = min(cur[j], prev2[j - 2] + 1)
        prev2, prev = prev, cur
        if min(prev) > limit:
            return limit + 1
    return prev[-1]


def email_key(email: str) -> str:
    """One spelling per mailbox: A.B+tin@Gmail.con -> ab@gmail.com."""
    email = (email or "").strip().lower()
    if "@" not in email:
        return email
    local, _, domain = email.rpartition("@")
    local = local.split("+", 1)[0]
    if domain in GMAIL:
        domain, local = "gmail.com", local.replace(".", "")
    return f"{local}@{domain}"


def name_key(name: str) -> str:
    """Nguyễn  Bích DUYÊN -> nguyen bich duyen."""
    text = unicodedata.normalize("NFD", (name or "").replace("đ", "d").replace("Đ", "D"))
    text = "".join(c for c in text if not unicodedata.combining(c)).lower()
    return " ".join(re.findall(r"[a-z]+", text))


SAME, COMPATIBLE, DIFFERENT, UNKNOWN = "same", "compatible", "different", "unknown"


def compare_names(a: str, b: str) -> str:
    ka, kb = name_key(a), name_key(b)
    # A learner created without a name carries the registration code (TWxxxxxxxx): no name to compare.
    if not ka or not kb or any(re.fullmatch(r"(TW|HV)[A-Z0-9]{8}", (n or "").strip()) for n in (a, b)):
        return UNKNOWN
    if ka == kb:
        return SAME
    ta, tb = set(ka.split()), set(kb.split())
    if ta <= tb or tb <= ta:  # "Duyên", "Duyen Nguyen" within "Nguyễn Bích Duyên"
        return COMPATIBLE
    if SequenceMatcher(None, ka, kb).ratio() >= 0.85:  # a typo: "Nguyen Bich Duyen" / "Nguyen Bich Duyn"
        return COMPATIBLE
    return DIFFERENT


def _phone_near(a: str, b: str) -> bool:
    return bool(a and b and len(a) >= 9 and a != b and distance(a, b, 1) <= 1)


def _email_near(a: str, b: str) -> str:
    """'local': one or two letters off on the same domain; 'domain': same mailbox, mistyped domain."""
    if not a or not b or a == b or "@" not in a or "@" not in b:
        return ""
    (la, da), (lb, db) = a.rsplit("@", 1), b.rsplit("@", 1)
    if la == lb and len(la) >= 4 and distance(da, db, 2) <= 2:
        return "domain"
    if da == db and len(la) >= 5 and distance(la, lb, 2) <= 2:
        return "local"
    return ""


class Match:
    def __init__(self, learner, sure: bool, reason: str):
        self.learner, self.sure, self.reason = learner, sure, reason


def candidates(
    *, full_name="", email="", phone="", citizen_id="", birth_date=None, exclude=None
) -> list[Match]:
    """Every learner that may be this person, best first (sure ones before possible ones)."""
    from apps.core.crypto import blind_index

    from .learners import phone_key
    from .models import Learner

    ekey, pkey, nkey = email_key(email), phone_key(phone), name_key(full_name)
    ckey = blind_index(citizen_id or "")
    query = Q(pk__in=[])
    if ckey:
        query |= Q(citizen_id_index=ckey)
    if ekey:
        query |= Q(email_index=ekey)
        if len(ekey.split("@")[0]) >= 4:  # the same mailbox on a mistyped domain
            query |= Q(email_index__startswith=ekey.split("@")[0] + "@")
    if pkey:
        query |= Q(phone_index=pkey)
    if nkey and len(nkey.split()) >= 2:  # a full name: typos in the phone / e-mail, same birth date
        query |= Q(name_index=nkey)
    rows = Learner.objects.filter(query).order_by("-created_at")
    if exclude is not None:
        rows = rows.exclude(pk=exclude)
    found: list[Match] = []
    for learner in rows[:50]:
        names = compare_names(full_name, learner.full_name)
        same_email = bool(ekey) and learner.email_index == ekey
        same_phone = bool(pkey) and learner.phone_index == pkey
        if ckey and learner.citizen_id_index == ckey:
            found.append(Match(learner, True, "Trùng CCCD"))
        elif (same_email or same_phone) and names != DIFFERENT:
            found.append(Match(learner, True, "Trùng email" if same_email else "Trùng số điện thoại"))
        elif same_email or same_phone:
            what = "email" if same_email else "số điện thoại"
            found.append(Match(learner, False, f"Trùng {what} nhưng khác tên (có thể người nhà dùng chung)"))
        elif names != DIFFERENT and _email_near(ekey, learner.email_index) == "domain":
            found.append(Match(learner, False, "Cùng địa chỉ email, tên miền gõ nhầm (vd. gmai.com)"))
        elif names == SAME:
            if _phone_near(pkey, learner.phone_index):
                found.append(Match(learner, False, "Cùng họ tên, số điện thoại lệch 1 chữ số"))
            elif _email_near(ekey, learner.email_index):
                found.append(Match(learner, False, "Cùng họ tên, email gần giống (gõ nhầm?)"))
            elif birth_date and learner.birth_date == birth_date:
                found.append(Match(learner, False, "Cùng họ tên và ngày sinh"))
    # Sure first; among sure ones CCCD, then e-mail, then phone (the order of trust).
    rank = {"Trùng CCCD": 0, "Trùng email": 1, "Trùng số điện thoại": 2}
    found.sort(key=lambda m: (not m.sure, rank.get(m.reason, 3)))
    return found


def learner_signals(learner) -> dict:
    return {
        "full_name": learner.full_name,
        "email": learner.email,
        "phone": learner.phone,
        "citizen_id": learner.citizen_id,
        "birth_date": learner.birth_date,
    }


def record_possible(learner, matches: list[Match]) -> int:
    """Keep the pairs staff should look at (a pair dismissed once is never asked again)."""
    from .models import LearnerMatch

    made = 0
    for m in matches:
        if m.learner.pk == learner.pk:
            continue
        a, b = sorted([learner, m.learner], key=lambda x: str(x.pk))
        _, created = LearnerMatch.objects.get_or_create(
            learner_a=a, learner_b=b, defaults={"reason": m.reason[:200]}
        )
        made += created
    return made


def scan(learner) -> int:
    """Look for other records of this learner: sure and possible ones all go to staff review."""
    found = candidates(**learner_signals(learner), exclude=learner.pk)
    for m in found:
        if m.sure:
            m.reason = f"{m.reason} (hai hồ sơ riêng)"
    return record_possible(learner, found)


def scan_all() -> int:
    from .models import Learner

    return sum(scan(learner) for learner in Learner.objects.all().iterator())
