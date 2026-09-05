"""Small deterministic guardrail that runs before any model or tool call."""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class GuardrailDecision:
    allowed: bool
    code: str
    reason: str


_INJECTION_PATTERNS = (
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"reveal\s+(the\s+)?system\s+prompt",
    r"disable\s+(your\s+)?(safety|approval|security)",
    r"send\s+.*without\s+(approval|asking)",
    r"act\s+as\s+(an?\s+)?admin",
)


def inspect_prompt(text: str) -> GuardrailDecision:
    normalized = " ".join(text.lower().split())
    for pattern in _INJECTION_PATTERNS:
        if re.search(pattern, normalized):
            return GuardrailDecision(
                allowed=False,
                code="PROMPT_INJECTION_BLOCKED",
                reason="The request attempted to change Noah's authority or bypass approval.",
            )
    return GuardrailDecision(allowed=True, code="OK", reason="Request is within the conversation boundary.")


def sanitize_external_text(text: str, limit: int = 12000) -> str:
    """Bound untrusted mail/document text before it reaches the model."""

    compact = " ".join(text.replace("\x00", " ").split())
    return compact[:limit]
