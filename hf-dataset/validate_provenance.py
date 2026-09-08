#!/usr/bin/env python3
"""Validate deterministic provenance-consistency fixtures without external deps."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "provenance.jsonl"

REPRESENTATIONS = {"http", "source_html", "rendered_dom", "external"}
LAYERS = {
    "http_header", "html", "meta", "open_graph", "twitter_card",
    "json_ld", "microdata", "rdfa", "visible_dom", "sitemap",
    "feed", "api",
}


def fail(message: str) -> None:
    raise SystemExit(f"provenance fixture validation failed: {message}")


def main() -> None:
    if not DATA.exists():
        fail(f"missing {DATA.relative_to(ROOT.parent)}")

    rows = []
    seen = set()
    for line_no, raw in enumerate(DATA.read_text(encoding="utf-8").splitlines(), 1):
        if not raw.strip():
            continue
        try:
            row = json.loads(raw)
        except json.JSONDecodeError as exc:
            fail(f"line {line_no}: invalid JSON: {exc}")
        if not isinstance(row, dict):
            fail(f"line {line_no}: record must be an object")
        for field in ("schema_version", "track", "id", "predicate", "observations", "expected"):
            if field not in row:
                fail(f"line {line_no}: missing {field}")
        if row["schema_version"] != "1.0":
            fail(f"line {line_no}: unsupported schema_version {row['schema_version']!r}")
        if row["track"] != "provenance-consistency":
            fail(f"line {line_no}: unexpected track {row['track']!r}")
        if not isinstance(row["id"], str) or not row["id"].strip():
            fail(f"line {line_no}: id must be non-empty string")
        if row["id"] in seen:
            fail(f"line {line_no}: duplicate id {row['id']!r}")
        seen.add(row["id"])
        if not isinstance(row["predicate"], str) or not row["predicate"].strip():
            fail(f"line {line_no}: predicate must be non-empty string")
        observations = row["observations"]
        if not isinstance(observations, list) or not observations:
            fail(f"line {line_no}: observations must be non-empty list")
        for index, observation in enumerate(observations):
            if not isinstance(observation, dict):
                fail(f"line {line_no}: observation {index} must be an object")
            if observation.get("representation") not in REPRESENTATIONS:
                fail(f"line {line_no}: observation {index} invalid representation")
            if observation.get("layer") not in LAYERS:
                fail(f"line {line_no}: observation {index} invalid layer")
            if "raw_value" not in observation:
                fail(f"line {line_no}: observation {index} missing raw_value")
        expected = row["expected"]
        if not isinstance(expected, dict) or not expected:
            fail(f"line {line_no}: expected must be non-empty object")
        if "logical_conflict" in expected and not isinstance(expected["logical_conflict"], bool):
            fail(f"line {line_no}: logical_conflict must be boolean")
        flags = expected.get("required_flags", [])
        if not isinstance(flags, list) or any(not isinstance(flag, str) or not flag for flag in flags):
            fail(f"line {line_no}: required_flags must be string array")
        rows.append(row)

    if len(rows) < 5:
        fail(f"expected at least 5 provenance fixtures, found {len(rows)}")

    required_ids = {
        "lower-bound-vs-exact-drift",
        "exact-price-conflict",
        "normalized-url-match",
        "same-calendar-date",
        "duplicate-metadata-preserved",
    }
    missing = sorted(required_ids - seen)
    if missing:
        fail(f"missing required regression cases: {', '.join(missing)}")

    print(f"provenance fixtures OK: {len(rows)} cases, schema 1.0")


if __name__ == "__main__":
    main()
