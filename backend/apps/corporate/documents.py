"""
Documents and checklist of corporate classes. Files go to private storage (never a public URL; staff
download through the API, audited). The checklist says which documents a class needs for its
acceptance and ticks the ones the system already holds (class list, published results, surveys,
invoice number) so staff upload only what exists on paper.
"""

import secrets
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.files.storage import storages

from .models import ClassDocument
from .services import CorporateError

MAX_BYTES = 15 * 1024 * 1024
ALLOWED = {".pdf", ".xlsx", ".xls", ".docx", ".doc", ".jpg", ".jpeg", ".png", ".zip"}
# Default checklist until each client's own is known (TMS question A6).
CHECKLIST = ["roster", "attendance", "results", "survey", "acceptance_record", "invoice"]


def upload(corporate_class, *, kind: str, title: str, file, note: str, user) -> ClassDocument:
    if file.size > MAX_BYTES:
        raise CorporateError("Tệp tối đa 15 MB.")
    ext = Path(file.name or "").suffix.lower()
    if ext not in ALLOWED:
        raise CorporateError("Chỉ nhận PDF, Word, Excel, ảnh JPG/PNG hoặc ZIP.")
    title = (title or Path(file.name).stem).strip()[:300]
    last = corporate_class.documents.filter(kind=kind, title=title).order_by("-version").first()
    name = storages["private"].save(
        f"corporate-documents/{corporate_class.pk}/{secrets.token_hex(8)}{ext}", ContentFile(file.read())
    )
    return ClassDocument.objects.create(
        corporate_class=corporate_class,
        kind=kind,
        title=title,
        version=(last.version + 1) if last else 1,
        file_key=name,
        file_name=(file.name or f"tai-lieu{ext}")[:255],
        size=file.size,
        note=note,
        uploaded_by=user,
    )


def checklist(corporate_class) -> list[dict]:
    """Each needed document: done by the system, by an upload, or missing."""
    labels = dict(ClassDocument.KIND_CHOICES)
    uploaded = {}
    for doc in corporate_class.documents.all():
        uploaded.setdefault(doc.kind, doc)
    system = {
        "roster": corporate_class.enrollments.exists(),
        "results": corporate_class.results.filter(status="published").exists(),
        "survey": corporate_class.surveys.exists(),
        "invoice": corporate_class.acceptance_lines.filter(
            batch__status="accepted", batch__invoice_number__gt=""
        ).exists(),
    }
    rows = []
    for kind in CHECKLIST:
        doc = uploaded.get(kind)
        rows.append(
            {
                "kind": kind,
                "label": labels[kind],
                "done": bool(doc) or system.get(kind, False),
                "source": "upload" if doc else "system" if system.get(kind) else "",
                "document": doc.pk if doc else None,
            }
        )
    return rows
