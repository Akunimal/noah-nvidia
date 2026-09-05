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

_EXTERNAL_AUTHORITY_PATTERNS = (
    r"(?:email|document|attachment|archivo).{0,80}(?:approve|send|delete|disable|admin)",
    r"(?:system|developer)\s+message",
    r"click\s+(?:this|the)\s+link",
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


def inspect_external_text(text: str) -> GuardrailDecision:
    """Treat recovered mail/document text as untrusted context."""

    normalized = sanitize_external_text(text).lower()
    for pattern in _EXTERNAL_AUTHORITY_PATTERNS:
        if re.search(pattern, normalized):
            return GuardrailDecision(False, "EXTERNAL_INSTRUCTION_QUARANTINED", "External text cannot change Noah's authority or request an unapproved effect.")
    return GuardrailDecision(True, "OK", "External text is bounded context.")


def inspect_action(tool: str, authority: str) -> GuardrailDecision:
    """Final deterministic boundary before a tool proposal is persisted."""

    if tool in {"mail.send", "calendar.create_event", "calendar.update_event", "calendar.delete_event", "ledger.confirm_entry"} and authority != "ask":
        return GuardrailDecision(False, "AUTHORITY_POLICY_REQUIRED", "This effect must remain behind owner approval.")
    if tool in {"money.move", "mail.delete_permanently", "shell.execute"}:
        return GuardrailDecision(False, "TOOL_DENIED", "This tool is outside Noah's allowed capability set.")
    return GuardrailDecision(True, "OK", "Tool proposal is within the declared capability boundary.")
