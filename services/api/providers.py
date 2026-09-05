"""NVIDIA model routing for Noah Nvidia.

The free OpenCode2API route is deliberately opt-in and synthetic-only. Nebius
Token Factory is the production/demo route. Neither route is allowed to execute
business side effects; the deterministic executor owns those transitions.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

import httpx

try:
    from providers_nim import nim_manifest
except ImportError:
    from .providers_nim import nim_manifest


@dataclass(frozen=True)
class ProviderResult:
    provider: str
    model: str
    text: str | None
    error: str | None = None


class Provider:
    name = "provider"
    mode = "unconfigured"

    def configured(self) -> bool:
        return False

    async def complete(self, prompt: str, system: str) -> ProviderResult:
        raise NotImplementedError

    def manifest(self) -> dict[str, Any]:
        return {"name": self.name, "mode": self.mode, "configured": self.configured()}


class OpenCode2ApiProvider(Provider):
    name = "opencode2api"
    mode = "free-synthetic"

    def __init__(self) -> None:
        self.base_url = os.getenv("NOAH_OPENCODE2API_BASE_URL", "").rstrip("/")
        self.api_key = os.getenv("NOAH_OPENCODE2API_KEY", "")
        self.model = os.getenv("NOAH_OPENCODE2API_MODEL", "nemotron-3-ultra-free")

    def configured(self) -> bool:
        return bool(self.base_url)

    def completions_url(self) -> str:
        if self.base_url.endswith("/chat/completions"):
            return self.base_url
        if self.base_url.endswith("/v1"):
            return self.base_url + "/chat/completions"
        return self.base_url + "/v1/chat/completions"

    async def complete(self, prompt: str, system: str) -> ProviderResult:
        if not self.configured():
            return ProviderResult(self.name, self.model, None, "OPENCODE2API_NOT_CONFIGURED")
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = "Bearer " + self.api_key
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
            "max_tokens": 900,
        }
        try:
            async with httpx.AsyncClient(timeout=35) as client:
                response = await client.post(self.completions_url(), headers=headers, json=payload)
            response.raise_for_status()
            body = response.json()
            text = body.get("choices", [{}])[0].get("message", {}).get("content")
            if not text:
                return ProviderResult(self.name, self.model, None, "OPENCODE2API_EMPTY_RESPONSE")
            return ProviderResult(self.name, self.model, str(text))
        except (httpx.HTTPError, ValueError) as exc:
            return ProviderResult(self.name, self.model, None, type(exc).__name__ + ": " + str(exc)[:180])


class NebiusProvider(Provider):
    name = "nebius"
    mode = "hackathon-demo"

    def __init__(self) -> None:
        self.base_url = os.getenv("NOAH_NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1").rstrip("/")
        self.api_key = os.getenv("NOAH_NEBIUS_API_KEY", "")
        self.model = os.getenv("NOAH_NEBIUS_MODEL", "nvidia/nemotron-3-super-120b-a12b")

    def configured(self) -> bool:
        return bool(self.api_key)

    async def complete(self, prompt: str, system: str) -> ProviderResult:
        if not self.configured():
            return ProviderResult(self.name, self.model, None, "NEBIUS_NOT_CONFIGURED")
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
            "max_tokens": 900,
        }
        try:
            async with httpx.AsyncClient(timeout=45) as client:
                response = await client.post(
                    self.base_url + "/chat/completions",
                    headers={"Authorization": "Bearer " + self.api_key, "Content-Type": "application/json"},
                    json=payload,
                )
            response.raise_for_status()
            body = response.json()
            text = body.get("choices", [{}])[0].get("message", {}).get("content")
            if not text:
                return ProviderResult(self.name, self.model, None, "NEBIUS_EMPTY_RESPONSE")
            return ProviderResult(self.name, self.model, str(text))
        except (httpx.HTTPError, ValueError) as exc:
            return ProviderResult(self.name, self.model, None, type(exc).__name__ + ": " + str(exc)[:180])


class NvidiaRouter:
    """Routes only to declared NVIDIA providers; no non-NVIDIA fallback exists."""

    def __init__(self) -> None:
        self.nebius = NebiusProvider()
        self.free = OpenCode2ApiProvider()

    def manifest(self) -> dict[str, Any]:
        return {
            "primary": self.nebius.manifest(),
            "free_sandbox": self.free.manifest(),
            "embeddings": nim_manifest(),
            "guardrails": {"provider": "nvidia-nemo-guardrails", "status": "deterministic-boundary"},
            "orchestration": {"provider": "nvidia-nemo-agent-toolkit", "status": "workflow-compatible"},
        }

    async def complete(self, prompt: str, system: str, *, allow_free_synthetic: bool = False) -> ProviderResult:
        if self.nebius.configured():
            return await self.nebius.complete(prompt, system)
        if allow_free_synthetic and self.free.configured() and os.getenv("NOAH_ALLOW_FREE_SYNTHETIC", "true").lower() == "true":
            return await self.free.complete(prompt, system)
        return ProviderResult("deterministic-demo", "no-model-call", None, "NO_NVIDIA_PROVIDER_CONFIGURED")
