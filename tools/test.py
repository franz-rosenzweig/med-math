#!/usr/bin/env python3
"""Run the Med Math answer-key tests (tools/test.html) in headless Chrome.

    tools/test.py            run them, print a summary, exit 1 if anything failed
    tools/test.py --table    also print the per-topic table

It serves the repo folder on a free localhost port, opens tools/test.html and reads the report.
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cdp import Browser, serve  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def main():
    base = serve(ROOT)
    b = Browser()
    try:
        b.go(f"{base}/tools/test.html", wait=0.5)
        report = None
        start = time.time()
        while time.time() - start < 300:
            report = b.js("window.__report || null")
            if report:
                break
            b.pump(0.5)
        if not report:
            print("No report after 5 minutes.")
            return 1
        print(f"{report['checks']:,} checks, {report['failureCount']} failed.")
        for line in report["log"]:
            print(" ", line)
        bad = [s for s in report["summary"] if s["agree"] != s["made"] or s["errors"]]
        made = sum(s["made"] for s in report["summary"])
        agree = sum(s["agree"] for s in report["summary"])
        print(f"Random problems: {agree:,} of {made:,} agree both ways, across {len(report['summary'])} topic/settings runs.")
        if "--table" in sys.argv or bad:
            for s in report["summary"]:
                v = f"  {s['verdicts']}" if s.get("verdicts") else ""
                print(f"  {s['profile'][:24]:24} {s['topic']:11} made {s['made']:5} agree {s['agree']:5} different {s['unique']:5} errors {s['errors']}{v}")
        for f in report["failures"]:
            print("FAIL:", f)
        if b.problems:
            print("Page errors:", *b.problems, sep="\n  ")
        return 0 if report["ok"] and not b.problems else 1
    finally:
        b.close()


if __name__ == "__main__":
    sys.exit(main())
