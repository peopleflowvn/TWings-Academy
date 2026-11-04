"""
manage.py import_legacy_crm <file.xlsx | -> [--apply]

The CRM workbook kept before this system (apps.crm.legacy_import): learners, registrations, payments and
the RB / EB classes run on the old platform. "-" reads the compact copy of the sheet (JSON rows, xz,
base64) from stdin, which is how the Ops task "legacy-crm" brings it to the server (the data is never
in the repository). Preview unless --apply; importing again adds only the rows not imported yet.
A copy that is {"fixes": [...]} instead corrects imported registrations (legacy_import.fix); one that is
{"stages": {code: old status}} puts them in the stage of their old status (legacy_import.restage).
Nothing is e-mailed.
"""

import sys

from django.core.management.base import BaseCommand, CommandError

from apps.crm.legacy_import import LegacyImportError, fix, read_compact, read_workbook, restage, run


class Command(BaseCommand):
    help = "Nhập dữ liệu CRM cũ (xem trước nếu không có --apply)."

    def add_arguments(self, parser):
        parser.add_argument("source", help="file .xlsx, hoặc - để đọc bản nén từ stdin")
        parser.add_argument("--apply", action="store_true", help="ghi vào cơ sở dữ liệu")

    def handle(self, source, apply, **options):
        try:
            table = read_compact(sys.stdin.read()) if source == "-" else read_workbook(source)
            if isinstance(table, dict) and "stages" in table:
                done = restage(table["stages"], apply=apply)
                for stage, n in sorted(done["stages"].items()):
                    self.stdout.write(f"  {stage}: {n}")
                for move, n in sorted(done["moved"].items()):
                    self.stdout.write(f"đổi {move}: {n}")
                if done["missing"]:
                    self.stdout.write(f"! không tìm thấy {len(done['missing'])} mã đăng ký")
                self.stdout.write("Đã ghi." if apply else "Xem trước: chưa ghi gì (thêm --apply để ghi).")
                return
            if isinstance(table, dict):
                for line in fix(table["fixes"], apply=apply):
                    self.stdout.write(line)
                self.stdout.write("Đã ghi." if apply else "Xem trước: chưa ghi gì (thêm --apply để ghi).")
                return
            summary = run(table, apply=apply)
        except LegacyImportError as exc:
            raise CommandError(str(exc)) from exc
        out = self.stdout.write
        skipped = ", ".join(f"{n} {k}" for k, n in summary["skipped"].items() if n)
        out(f"{summary['rows']} dòng → {summary['registrations']} đăng ký (bỏ qua: {skipped or 'không'})")
        for stage, n in sorted(summary["stages"].items()):
            out(f"  {stage}: {n}")
        out(f"  bảo lưu: {summary['deferred']}, đã đóng phí chưa xếp lớp: {summary['paidWithoutClass']}")
        for c in summary["classes"]:
            exists = " (đã có)" if c["exists"] else ""
            out(
                f"lớp {c['code']} {c['name']}{exists} | {c['course']} | {c['status']} | "
                f"{c['learners']} học viên, {c['paidInFull']} đóng đủ"
            )
        for warning in summary["warnings"]:
            out(f"! {warning}")
        out("Đã ghi." if apply else "Xem trước: chưa ghi gì (thêm --apply để ghi).")
