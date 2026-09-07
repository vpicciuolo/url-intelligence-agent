#!/usr/bin/env python3
import argparse
import json
import os
from collections import defaultdict
from datetime import datetime, timezone
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


def pct(ok, total):
    return None if total == 0 else round(ok / total * 100, 2)


def metric(ok=0, total=0):
    return {"ok": ok, "total": total, "pct": pct(ok, total)}


def add_metric(bucket, name, ok):
    bucket[name][1] += 1
    bucket[name][0] += int(bool(ok))


def format_pct(value):
    return "n/a" if value is None else f"{value:.2f}%"


def main():
    parser = argparse.ArgumentParser(description="Score URL Intelligence Benchmark predictions")
    parser.add_argument("predictions", help="JSONL predictions produced by an analyzer")
    parser.add_argument("--json-out", help="Write machine-readable summary JSON")
    parser.add_argument("--markdown-out", help="Write human-readable Markdown summary")
    args = parser.parse_args()

    benchmark_rows = load_jsonl(BENCHMARK)
    benchmark = {r["id"]: r for r in benchmark_rows}
    prediction_rows = load_jsonl(args.predictions)
    predictions = {r["id"]: r for r in prediction_rows}

    metrics = defaultdict(lambda: [0, 0])
    deterministic_assertions = [0, 0]
    case_counts = [0, 0]
    deterministic_cases = [0, 0]
    security_cases = [0, 0]
    full_agent = [0, 0]
    group_counts = defaultdict(lambda: [0, 0])
    failures = []
    missing = []
    elapsed_values = []

    for case_id, expected in benchmark.items():
        pred = predictions.get(case_id)
        if pred is None:
            missing.append(case_id)
            failures.append({"id": case_id, "group": expected["group"], "failed_checks": ["missing_prediction"]})
            continue

        if isinstance(pred.get("elapsed_ms"), (int, float)):
            elapsed_values.append(pred["elapsed_ms"])

        checks = []

        action_ok = pred.get("action") == expected["expected_action"]
        add_metric(metrics, "action", action_ok)
        checks.append(("action", action_ok))

        exp_family = expected.get("expected_initial_status_family")
        if exp_family:
            status_ok = family(pred.get("initial_status")) == exp_family
            add_metric(metrics, "status_family", status_ok)
            checks.append(("status_family", status_ok))

        redirect_min = expected.get("expected_redirects_min", 0)
        if redirect_min > 0:
            try:
                got_redirects = int(pred.get("redirect_count", -1))
            except (TypeError, ValueError):
                got_redirects = -1
            redirects_ok = got_redirects >= redirect_min
            add_metric(metrics, "redirects", redirects_ok)
            checks.append(("redirects", redirects_ok))

        exp_kind = expected.get("expected_content_kind")
        if exp_kind:
            kind_ok = pred.get("content_kind") == exp_kind
            add_metric(metrics, "content_kind", kind_ok)
            checks.append(("content_kind", kind_ok))

        case_ok = all(ok for _, ok in checks)
        case_counts[1] += 1
        case_counts[0] += int(case_ok)
        group_counts[expected["group"]][1] += 1
        group_counts[expected["group"]][0] += int(case_ok)

        assertion_total = len(checks)
        assertion_ok = sum(int(ok) for _, ok in checks)
        metrics["overall_assertions"][1] += assertion_total
        metrics["overall_assertions"][0] += assertion_ok

        if expected.get("deterministic"):
            deterministic_cases[1] += 1
            deterministic_cases[0] += int(case_ok)
            deterministic_assertions[1] += assertion_total
            deterministic_assertions[0] += assertion_ok

        if expected.get("expected_action") in {"reject", "block"}:
            security_cases[1] += 1
            security_cases[0] += int(action_ok)

        if pred.get("agent_applicable"):
            full_agent[1] += 1
            full_agent[0] += int(bool(pred.get("agent_completed")))

        failed_checks = [name for name, ok in checks if not ok]
        if failed_checks:
            failures.append({
                "id": case_id,
                "group": expected["group"],
                "failed_checks": failed_checks,
                "expected_action": expected["expected_action"],
                "actual_action": pred.get("action"),
                "error": pred.get("error"),
            })

    summary_metrics = {name: metric(ok, total) for name, (ok, total) in sorted(metrics.items())}
    summary_metrics["case_pass_rate"] = metric(*case_counts)
    summary_metrics["deterministic_assertions"] = metric(*deterministic_assertions)
    summary_metrics["deterministic_case_pass_rate"] = metric(*deterministic_cases)
    summary_metrics["security_action_accuracy"] = metric(*security_cases)
    summary_metrics["full_agent_completion"] = metric(*full_agent)

    groups = {
        name: metric(ok, total)
        for name, (ok, total) in sorted(group_counts.items())
    }

    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    summary = {
        "benchmark": "vpicciuolo/url-intelligence-benchmark",
        "benchmark_cases": len(benchmark),
        "predictions": len(predictions),
        "missing": missing,
        "generated_at": generated_at,
        "git_sha": os.environ.get("GITHUB_SHA"),
        "overall_score": summary_metrics["overall_assertions"]["pct"],
        "deterministic_score": summary_metrics["deterministic_assertions"]["pct"],
        "metrics": summary_metrics,
        "groups": groups,
        "average_network_elapsed_ms": round(sum(elapsed_values) / len(elapsed_values)) if elapsed_values else None,
        "failures": failures,
    }

    print(f"Cases: {len(benchmark)} | Predictions: {len(predictions)} | Missing: {len(missing)}")
    print(f"Overall benchmark score: {format_pct(summary['overall_score'])}")
    print(f"Deterministic score:     {format_pct(summary['deterministic_score'])}")
    for name in ["action", "status_family", "redirects", "content_kind", "case_pass_rate", "security_action_accuracy", "full_agent_completion"]:
        item = summary_metrics.get(name, metric())
        print(f"{name:28} {item['ok']:>3}/{item['total']:<3} {format_pct(item['pct']):>8}")

    if failures:
        print("\nFailed cases:")
        for failure in failures:
            print(f"- {failure['id']}: {', '.join(failure['failed_checks'])}")

    if args.json_out:
        path = Path(args.json_out)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    if args.markdown_out:
        path = Path(args.markdown_out)
        path.parent.mkdir(parents=True, exist_ok=True)
        lines = [
            "# URL Intelligence Benchmark Results",
            "",
            f"Generated: **{generated_at}**  ",
            f"Benchmark cases: **{len(benchmark)}**  ",
            f"Overall assertion score: **{format_pct(summary['overall_score'])}**  ",
            f"Deterministic assertion score: **{format_pct(summary['deterministic_score'])}**",
            "",
            "| Metric | Passed | Total | Score |",
            "|---|---:|---:|---:|",
        ]
        labels = {
            "action": "Action accuracy",
            "status_family": "HTTP status-family accuracy",
            "redirects": "Redirect handling",
            "content_kind": "Content-kind detection",
            "case_pass_rate": "Case pass rate",
            "deterministic_case_pass_rate": "Deterministic case pass rate",
            "security_action_accuracy": "Reject/block safety accuracy",
            "full_agent_completion": "Full-agent HTML completion",
        }
        for key, label in labels.items():
            item = summary_metrics.get(key, metric())
            lines.append(f"| {label} | {item['ok']} | {item['total']} | {format_pct(item['pct'])} |")

        lines.extend(["", "## Group results", "", "| Group | Passed | Total | Score |", "|---|---:|---:|---:|"])
        for name, item in groups.items():
            lines.append(f"| `{name}` | {item['ok']} | {item['total']} | {format_pct(item['pct'])} |")

        lines.extend(["", "## Failed cases", ""])
        if failures:
            lines.extend(f"- `{item['id']}` — {', '.join(item['failed_checks'])}" for item in failures[:30])
            if len(failures) > 30:
                lines.append(f"- …and {len(failures) - 30} more")
        else:
            lines.append("No failed benchmark cases.")

        lines.extend([
            "",
            "> Scores are produced by running the repository's real URL fetching/safety code. Selected public HTML cases also execute the full `investigate()` pipeline with a one-page benchmark crawl. Live-web cases can vary when upstream services change or rate-limit requests.",
            "",
        ])
        path.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
