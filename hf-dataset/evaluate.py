#!/usr/bin/env python3
import json
import sys
from pathlib import Path

BENCHMARK = Path(__file__).parent / "data" / "benchmark.jsonl"


def load_jsonl(path):
    with open(path, "r", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def family(status):
    if status is None:
        return None
    try:
        n = int(status)
    except (TypeError, ValueError):
        return None
    return f"{n // 100}xx" if 100 <= n <= 599 else None


def ratio(ok, total):
    return None if total == 0 else ok / total


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python evaluate.py predictions.jsonl")

    benchmark = {r["id"]: r for r in load_jsonl(BENCHMARK)}
    predictions = {r["id"]: r for r in load_jsonl(sys.argv[1])}

    metrics = {
        "action": [0, 0],
        "status_family": [0, 0],
        "redirects": [0, 0],
        "content_kind": [0, 0],
    }

    missing = []
    for case_id, expected in benchmark.items():
        pred = predictions.get(case_id)
        if pred is None:
            missing.append(case_id)
            continue

        metrics["action"][1] += 1
        metrics["action"][0] += pred.get("action") == expected["expected_action"]

        exp_family = expected.get("expected_initial_status_family")
        if exp_family:
            metrics["status_family"][1] += 1
            metrics["status_family"][0] += family(pred.get("initial_status")) == exp_family

        if expected.get("expected_redirects_min", 0) > 0:
            metrics["redirects"][1] += 1
            try:
                got_redirects = int(pred.get("redirect_count", -1))
            except (TypeError, ValueError):
                got_redirects = -1
            metrics["redirects"][0] += got_redirects >= expected["expected_redirects_min"]

        exp_kind = expected.get("expected_content_kind")
        if exp_kind:
            metrics["content_kind"][1] += 1
            metrics["content_kind"][0] += pred.get("content_kind") == exp_kind

    print(f"Cases: {len(benchmark)} | Predictions: {len(predictions)} | Missing: {len(missing)}")
    for name, (ok, total) in metrics.items():
        score = ratio(ok, total)
        print(f"{name:16} {ok:>3}/{total:<3} " + ("n/a" if score is None else f"{score*100:6.2f}%"))

    if missing:
        print("\nMissing IDs:")
        for case_id in missing:
            print(f"- {case_id}")


if __name__ == "__main__":
    main()
