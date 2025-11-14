#!/usr/bin/env python3
"""Helper to inspect legacy backup files before cleaning."""

from __future__ import annotations

import argparse
import fnmatch
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PATTERNS = [
    "*.bak",
    "*.backup*",
    "*.old",
    "*.previous",
    "*.broken",
    "*.tmp",
    "*.orig",
]
EXCLUDE_DIRS = {
    ".git",
    "node_modules",
    "frontend/harvester-ui/node_modules",
    "frontend/harvester-ui/build",
    "frontend/harvester-ui/dist",
    "backend/venv",
    "frontend/harvester-ui/.cache",
    "files-harvester",
}


def matches_pattern(path: Path) -> bool:
    return any(fnmatch.fnmatch(path.name, pattern) for pattern in PATTERNS)


def is_excluded(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    return any(part in EXCLUDE_DIRS for part in rel.parts)


def collect() -> list[Path]:
    matches: list[Path] = []
    for path in ROOT.rglob("*"):
        if path.is_file() and matches_pattern(path) and not is_excluded(path):
            matches.append(path)
    return sorted(matches)


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect or delete legacy backup files.")
    parser.add_argument(
        "--delete",
        action="store_true",
        help="Remove every matching file after listing (requires --confirm).",
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Skip the interactive confirmation when --delete is enabled.",
    )
    args = parser.parse_args()

    legacy_files = collect()
    if not legacy_files:
        print("✅ Aucun fichier legacy trouvé.")
        return

    print("Fichiers legacy détectés:")
    for path in legacy_files:
        print(f"  - {path.relative_to(ROOT)}")

    if not args.delete:
        print("\nPense à lancer avec --delete --confirm pour supprimer après vérification.")
        return

    if not args.confirm:
        answer = input("\nSupprimer ces fichiers ? Tape 'OUI' pour confirmer: ")
        if answer.strip().upper() != "OUI":
            print("Annulation.")
            return

    removed = 0
    for path in legacy_files:
        try:
            path.unlink()
            removed += 1
        except OSError as exc:
            print(f"Erreur suppression {path}: {exc}")
    print(f"\nSuppression terminée: {removed} fichier(s) supprimé(s).")


if __name__ == "__main__":
    main()
