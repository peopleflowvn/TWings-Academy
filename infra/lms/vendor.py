#!/usr/bin/env python3
"""
Moodle and its third-party plugins are vendored in lms/ with `git subtree --squash`: each component
has a "Squashed '<path>/' ..." commit in our history whose tree is exactly the upstream code. That
snapshot is the reference for everything below, so TWings can edit lms/ freely and still know (and
merge) what upstream changed.

  python infra/lms/vendor.py status              components, versions, files TWings changed
  python infra/lms/vendor.py check               CI: snapshots match vendor.json, changes match patches.txt
  python infra/lms/vendor.py diff <path>         one changed file against its upstream version
  python infra/lms/vendor.py update <name> <commit> [--ref TAG]
                                                 3-way merge a new upstream version (security fixes...)
  python infra/lms/vendor.py add <name> <path> <repo> <commit> [--ref TAG]
                                                 vendor a new third-party plugin
  python infra/lms/vendor.py remove <name>       drop a third-party plugin (uninstall it in Moodle too)

Needs the full git history (CI: fetch-depth 0). Standard library only.
"""

# A developer/CI tool that only runs git with arguments from this repository.
# ruff: noqa: S603, S607

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOCK = ROOT / "infra/lms/vendor.json"
PATCHES = ROOT / "infra/lms/patches.txt"
GITLEAKS = ROOT / ".gitleaks.toml"
LEAKS_BEGIN, LEAKS_END = "# vendor-snapshots:begin", "# vendor-snapshots:end"


def git(*args: str, check: bool = True) -> str:
    result = subprocess.run(
        ["git", *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace"
    )
    if check and result.returncode != 0:
        sys.exit(f"git {' '.join(args)} failed:\n{result.stderr.strip()}")
    return result.stdout.strip()


def load() -> dict:
    return json.loads(LOCK.read_text(encoding="utf-8"))


def save(lock: dict) -> None:
    LOCK.write_text(json.dumps(lock, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")


def snapshot(path: str) -> tuple[str, str] | None:
    """(our squash commit, upstream commit it contains) of the latest import of `path`."""
    pattern = "^Squashed '" + re.escape(path + "/").replace("\\/", "/") + "' (content|changes) from "
    sha = git("log", "-1", "--format=%H", "-E", f"--grep={pattern}")
    if not sha:
        return None
    match = re.search(r"^git-subtree-split: ([0-9a-f]{40})", git("log", "-1", "--format=%B", sha), re.M)
    return sha, match.group(1) if match else ""


def _inside(path: str, parent: str) -> bool:
    return path == parent or path.startswith(parent + "/")


def changes(component: dict, lock: dict, rev: str = "HEAD") -> list[tuple[str, str]]:
    """[(A|M|D, repo path)] of files that differ from the component's upstream snapshot."""
    snap = snapshot(component["path"])
    if snap is None:
        return []
    base = component["path"]
    # Nested components and TWings' own plugins are not changes of this component.
    skip = [c["path"] for c in lock["components"] if c is not component and _inside(c["path"], base)]
    skip += [p for p in lock["owned"] if _inside(p, base)]
    out = git(
        "diff-tree", "-r", "--no-renames", "--name-status", "-z", f"{snap[0]}^{{tree}}", f"{rev}:{base}"
    )
    fields = out.split("\0")
    result = []
    for status, rel in zip(fields[0::2], fields[1::2], strict=False):
        full = f"{base}/{rel}"
        if status and not any(_inside(full, s) for s in skip):
            result.append((status[0], full))
    return result


def registered_patches() -> dict[str, str]:
    entries = {}
    for line in PATCHES.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            path, _, why = line.partition(" ")
            entries[path] = why.strip()
    return entries


# ---------------------------------------------------------------- commands
def cmd_status(args) -> int:
    lock = load()
    for c in lock["components"]:
        snap = snapshot(c["path"])
        state = f"snapshot {snap[0][:9]} = upstream {snap[1][:9]}" if snap else "NOT IMPORTED"
        found = changes(c, lock)
        print(f"{c['name']:<28} {c['ref']:<16} {state}   {len(found)} file(s) changed by TWings")
        for status, path in found:
            print(f"    {status} {path}")
    print("\nTWings-owned:", ", ".join(p for p in lock["owned"] if (ROOT / p).exists()) or "-")
    return 0


def cmd_check(args) -> int:
    lock, errors, actual = load(), [], set()
    for c in lock["components"]:
        snap = snapshot(c["path"])
        if snap is None:
            errors.append(
                f"{c['name']}: no squash commit for '{c['path']}/' (needs full history: fetch-depth 0)"
            )
            continue
        if snap[1] != c["commit"]:
            errors.append(f"{c['name']}: vendor.json says {c['commit'][:9]}, lms/ contains {snap[1][:9]}")
        actual |= {path for _, path in changes(c, lock)}
    registered = registered_patches()
    for path in sorted(actual - registered.keys()):
        errors.append(f"{path}: differs from upstream but is not listed in infra/lms/patches.txt")
    for path in sorted(registered.keys() - actual):
        errors.append(f"{path}: listed in infra/lms/patches.txt but identical to upstream (remove the line)")
    for path, why in registered.items():
        if not why:
            errors.append(f"{path}: patches.txt entry needs a reason")
    for error in errors:
        print(f"::error::{error}" if args.github else f"ERROR {error}")
    if not errors:
        count = len(lock["components"])
        print(f"lms/: {count} components match vendor.json; {len(actual)} documented patch(es)")
    return 1 if errors else 0


def cmd_diff(args) -> int:
    path = args.path.replace("\\", "/").rstrip("/")
    lock = load()
    owners = [c for c in lock["components"] if _inside(path, c["path"])]
    if not owners:
        sys.exit(f"{path} is not vendored code")
    component = max(owners, key=lambda c: len(c["path"]))  # the innermost component owns the file
    snap = snapshot(component["path"])
    upstream = f"{snap[0]}:{path[len(component['path']) + 1 :]}"
    local = ROOT / path
    if subprocess.run(["git", "cat-file", "-e", upstream], cwd=ROOT, capture_output=True).returncode:
        print(f"{path}: not in upstream {component['name']} (added by TWings)")
        return 0
    if not local.exists():
        print(f"{path}: deleted by TWings")
        return 0
    # Upstream version vs the file on disk (uncommitted edits included).
    with tempfile.TemporaryDirectory() as tmp:
        original = Path(tmp) / f"upstream-{local.name}"
        original.write_bytes(
            subprocess.run(
                ["git", "cat-file", "blob", upstream], cwd=ROOT, capture_output=True, check=True
            ).stdout
        )
        subprocess.run(["git", "--no-pager", "diff", "--no-index", str(original), str(local)], cwd=ROOT)
    return 0


def _require_clean() -> None:
    if git("status", "--porcelain"):
        sys.exit("Commit or stash your changes first (git subtree needs a clean working tree).")


def _fetch(repo: str, commit: str) -> None:
    print(f"fetching {repo} {commit[:9]} (depth 1)...")
    git("fetch", "--depth", "1", "--no-tags", repo, commit)
    if git("rev-parse", "FETCH_HEAD") != commit:
        sys.exit("FETCH_HEAD is not the requested commit")


def _record(lock: dict, component: dict, message: str) -> None:
    """Write vendor.json + the gitleaks allowlist of upstream snapshots, and commit them."""
    snap = snapshot(component["path"])
    save(lock)
    text = GITLEAKS.read_text(encoding="utf-8")
    start, end = text.index(LEAKS_BEGIN), text.index(LEAKS_END)
    listed = re.findall(r"'([0-9a-f]{40})'", text[start:end])
    if snap and snap[0] not in listed:
        listed.append(snap[0])
    block = LEAKS_BEGIN + "\n" + "".join(f"  '{sha}',\n" for sha in listed) + "  "
    GITLEAKS.write_text(text[:start] + block + text[end:], encoding="utf-8", newline="\n")
    git("add", str(LOCK), str(GITLEAKS))
    if not git("diff", "--cached", "--name-only"):
        print("vendor.json and .gitleaks.toml already up to date")
        return
    git("commit", "-q", "-m", message)
    print(f"recorded: {message.splitlines()[0]}")


def cmd_update(args) -> int:
    lock = load()
    component = next((c for c in lock["components"] if c["name"] == args.name), None)
    if component is None:
        sys.exit(f"unknown component {args.name}; known: {', '.join(c['name'] for c in lock['components'])}")
    _require_clean()
    _fetch(component["repo"], args.commit)
    label = args.ref or args.commit[:9]
    result = subprocess.run(
        [
            "git",
            "subtree",
            "merge",
            f"--prefix={component['path']}",
            "--squash",
            "FETCH_HEAD",
            "-m",
            f"chore(lms): update {args.name} to {label}",
        ],
        cwd=ROOT,
    )
    component["commit"], component["ref"] = args.commit, args.ref or component["ref"]
    if result.returncode != 0:
        save(lock)
        print(
            "\nConflicts between upstream and TWings patches. Resolve them (keep TWings' intent, take\n"
            "upstream's fix), `git add` + `git commit`, then run:\n"
            f"  python infra/lms/vendor.py record {args.name}\n"
            "and update infra/lms/patches.txt if a patch became unnecessary."
        )
        return 1
    _record(lock, component, f"chore(lms): record {args.name} {label}")
    print("Next: python infra/lms/vendor.py check, then build/deploy (Moodle upgrades its DB on deploy).")
    return 0


def cmd_record(args) -> int:
    """After resolving update conflicts by hand: write vendor.json and the gitleaks allowlist."""
    lock = load()
    component = next(c for c in lock["components"] if c["name"] == args.name)
    _record(lock, component, f"chore(lms): record {args.name} {component['ref']}")
    return 0


def cmd_add(args) -> int:
    lock = load()
    path = args.path.replace("\\", "/").rstrip("/")
    if any(c["name"] == args.name or c["path"] == path for c in lock["components"]):
        sys.exit("a component with that name or path already exists (use update)")
    _require_clean()
    _fetch(args.repo, args.commit)
    label = args.ref or args.commit[:9]
    git(
        "subtree",
        "add",
        f"--prefix={path}",
        "--squash",
        "FETCH_HEAD",
        "-m",
        f"feat(lms): vendor {args.name} in {path} ({label})",
    )
    component = {"name": args.name, "path": path, "repo": args.repo, "ref": label, "commit": args.commit}
    lock["components"].append(component)
    _record(lock, component, f"chore(lms): record {args.name} {label}")
    return 0


def cmd_remove(args) -> int:
    """Delete a vendored plugin from lms/ and vendor.json; its snapshot stays in history (and gitleaks)."""
    lock = load()
    component = next((c for c in lock["components"] if c["name"] == args.name), None)
    if component is None or component["name"] == "core":
        sys.exit(f"{args.name}: not a removable component")
    _require_clean()
    git("rm", "-r", "-q", component["path"])
    lock["components"].remove(component)
    save(lock)
    git("add", str(LOCK))
    git("commit", "-q", "-m", f"chore(lms): remove {args.name} from {component['path']}")
    print(
        f"removed {component['path']}. Moodle keeps it as 'missing from disk' until uninstalled "
        "(admin/cli/uninstall_plugins.php --purge-missing --run), e.g. from twings_setup.php."
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("status").set_defaults(func=cmd_status)
    check = sub.add_parser("check")
    check.add_argument("--github", action="store_true", help="GitHub Actions error annotations")
    check.set_defaults(func=cmd_check)
    diff = sub.add_parser("diff")
    diff.add_argument("path")
    diff.set_defaults(func=cmd_diff)
    update = sub.add_parser("update")
    update.add_argument("name")
    update.add_argument("commit")
    update.add_argument("--ref", default="")
    update.set_defaults(func=cmd_update)
    record = sub.add_parser("record")
    record.add_argument("name")
    record.set_defaults(func=cmd_record)
    add = sub.add_parser("add")
    for name in ("name", "path", "repo", "commit"):
        add.add_argument(name)
    add.add_argument("--ref", default="")
    add.set_defaults(func=cmd_add)
    remove = sub.add_parser("remove")
    remove.add_argument("name")
    remove.set_defaults(func=cmd_remove)
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
