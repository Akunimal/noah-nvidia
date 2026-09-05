"""Optional NeMo Agent Toolkit registration.

The API remains bootable on a CPU-only free host. When the pinned NVIDIA
packages are installed, this module is the registration point for typed tools.
"""

from __future__ import annotations

from typing import Any

try:
    import nat  # type: ignore

    NAT_AVAILABLE = True
except ImportError:
    NAT_AVAILABLE = False

try:
    import nemoguardrails  # type: ignore

    GUARDRAILS_AVAILABLE = True
except ImportError:
    GUARDRAILS_AVAILABLE = False


TOOL_NAMES = (
    "business.get_profile",
    "services.search",
    "contacts.search",
    "knowledge.search",
    "mail.search",
    "mail.read",
    "mail.prepare_draft",
    "calendar.list",
    "calendar.find_slots",
    "quotes.prepare",
    "ledger.propose_entry",
    "tasks.create",
    "actions.propose",
)


def workflow_status() -> dict[str, Any]:
    return {
        "provider": "nvidia-nemo-agent-toolkit",
        "package": "nvidia-nat",
        "version": "1.8.x",
        "installed": NAT_AVAILABLE,
        "registration": "available" if NAT_AVAILABLE else "optional-runtime-dependency",
        "tool_count": len(TOOL_NAMES),
        "tools": list(TOOL_NAMES),
        "effects": "executor-only",
        "guardrails": {
            "package": "nemoguardrails",
            "version": "0.24.x",
            "installed": GUARDRAILS_AVAILABLE,
            "registration": "deterministic-boundary" if not GUARDRAILS_AVAILABLE else "runtime-ready",
        },
    }


async def propose_action(request: str) -> dict[str, str]:
    """Typed tool boundary: return a proposal, never execute an effect."""

    return {"request": request, "status": "proposed"}


def register_tools(builder: Any) -> bool:
    """Register the typed proposal tool with a NeMo builder when available.

    Keeping registration behind this function means a free CPU demo can boot
    without importing optional toolkit internals. The installed toolkit owns
    the builder registration API in a connected deployment.
    """

    if not NAT_AVAILABLE:
        return False
    register = getattr(builder, "register_function", None)
    if register is None:
        return False
    register(propose_action)
    return True
