"""Fail CI when common credential formats appear in tracked files."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path


PATTERNS = (
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"\bsk-[A-Za-z0-9]{20,}\b"),
    re.compile(r"\bAIza[0-9A-Za-z_-]{30,}\b"),
    re.compile(r"\bya29\.[0-9A-Za-z_-]{20,}\b"),
    re.compile(r"(?im)^[ \t]*NOAH_(?:NEBIUS|NVIDIA_NIM|OPENCODE2API)_API_KEY[ \t]*=[ \t]*[^\s#\r\n]{20,}"),
    re.compile(r"(?im)^[ \t]*GOOGLE_CLIENT_SECRET[ \t]*=[ \t]*[^\s#\r\n]{20,}"),
)


def tracked_files() -> list[Path]:
    result = subprocess.run(["git", "ls-files", "-z"], check=True, capture_output=True)
    return [Path(item) for item in result.stdout.decode("utf-8").split("\0") if item]


def main() -> int:
    findings: list[str] = []
    for path in tracked_files():
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        for pattern in PATTERNS:
            if pattern.search(text):
                findings.append(f"{path}: {pattern.pattern}")
    if findings:
        print("Potential credentials found:", file=sys.stderr)
        print("\n".join(findings), file=sys.stderr)
        return 1
    print("No common credential formats found in tracked files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
