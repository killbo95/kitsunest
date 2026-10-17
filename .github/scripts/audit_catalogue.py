#!/usr/bin/env python3
"""Read-only audit for KitsuNest catalogue and anime JSON records."""
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ANIME_DIR = ROOT / "anime"
INDEX_FILE = ROOT / "index.html"


def normalize(value):
    value = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode().lower()
    value = value.replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", "", value)


def main():
    errors = []
    warnings = []
    files = sorted(ANIME_DIR.glob("*.json"))
    records = []
    title_paths = defaultdict(list)
    id_paths = defaultdict(list)

    if not files:
        errors.append("No anime/*.json files were found.")

    for path in files:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"{path.relative_to(ROOT)}: invalid JSON ({exc})")
            continue

        if not isinstance(data, dict):
            errors.append(f"{path.relative_to(ROOT)}: top-level JSON value must be an object")
            continue

        title = data.get("title")
        anime_id = data.get("id")
        if not isinstance(title, str) or not title.strip():
            errors.append(f"{path.relative_to(ROOT)}: missing/empty string field 'title'")
        else:
            title_paths[normalize(title)].append((title, path.name))

        if not isinstance(anime_id, str) or not anime_id.strip():
            errors.append(f"{path.relative_to(ROOT)}: missing/empty string field 'id'")
        else:
            id_paths[normalize(anime_id)].append((anime_id, path.name))
            if normalize(anime_id) != normalize(path.stem):
                warnings.append(f"ID/filename mismatch: {path.as_posix()} has id={anime_id!r}")

        for field in ("episodeSources", "seasonEpisodeSources"):
            if field in data and not isinstance(data[field], dict):
                errors.append(f"{path.relative_to(ROOT)}: '{field}' must be an object")

        if "episodes" in data and not isinstance(data["episodes"], (int, float, dict, list)):
            warnings.append(f"{path.relative_to(ROOT)}: unusual 'episodes' value type {type(data['episodes']).__name__}")

        records.append((path, data))

    for key, items in title_paths.items():
        if key and len(items) > 1:
            errors.append("Duplicate normalized anime title: " + " | ".join(f"{title} ({name})" for title, name in items))
    for key, items in id_paths.items():
        if key and len(items) > 1:
            errors.append("Duplicate normalized anime id: " + " | ".join(f"{anime_id} ({name})" for anime_id, name in items))

    catalogue_entries = []
    if not INDEX_FILE.exists():
        errors.append("index.html is missing; catalogue reference checks skipped.")
    else:
        html = INDEX_FILE.read_text(encoding="utf-8")
        match = re.search(r"\bvar\s+shows\s*=\s*\[(.*?)\];", html, re.S)
        if not match:
            warnings.append("Could not locate the 'var shows=[...]' catalogue array in index.html; catalogue reference checks skipped.")
        else:
            catalogue_entries = re.findall(r'\{\s*id\s*:\s*["\']([^"\']+)["\']\s*,\s*title\s*:\s*["\']([^"\']+)["\']', match.group(1))
            if not catalogue_entries:
                warnings.append("Catalogue array was found, but no {id, title} entries matched the audit pattern.")

            catalogue_ids = defaultdict(list)
            catalogue_titles = defaultdict(list)
            for anime_id, title in catalogue_entries:
                catalogue_ids[normalize(anime_id)].append((anime_id, title))
                catalogue_titles[normalize(title)].append((anime_id, title))

            for key, items in catalogue_ids.items():
                if key and len(items) > 1:
                    errors.append("Duplicate catalogue id: " + " | ".join(f"{i} ({t})" for i, t in items))
            for key, items in catalogue_titles.items():
                if key and len(items) > 1:
                    errors.append("Duplicate catalogue title: " + " | ".join(f"{t} [{i}]" for i, t in items))

            file_stems = {normalize(p.stem): p.name for p in files}
            for anime_id, title in catalogue_entries:
                if normalize(anime_id) not in file_stems:
                    warnings.append(f"Catalogue ID has no matching anime/<id>.json file: id={anime_id!r}, title={title!r}")

            catalogue_id_keys = {normalize(i) for i, _ in catalogue_entries}
            for path in files:
                if normalize(path.stem) not in catalogue_id_keys:
                    warnings.append(f"JSON file is not directly referenced by catalogue ID: {path.as_posix()}")

    print("KITSUNEST READ-ONLY CATALOGUE AUDIT")
    print(f"JSON files found: {len(files)}")
    print(f"Valid JSON object records: {len(records)}")
    print(f"Catalogue entries parsed: {len(catalogue_entries)}")
    print(f"Errors: {len(errors)}")
    print(f"Warnings: {len(warnings)}")
    if errors:
        print("\nERRORS")
        for item in errors:
            print(f"- {item}")
    if warnings:
        print("\nWARNINGS")
        for item in warnings:
            print(f"- {item}")
    if not errors and not warnings:
        print("No issues found.")
    # Warnings are informational (legacy IDs may be intentional); only structural errors fail the run.
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
