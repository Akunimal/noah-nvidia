"""NVIDIA model routing for Noah Nvidia.

The free OpenCode2API transport is deliberately opt-in, synthetic-only, and
restricted to NVIDIA Nemotron model identifiers. Nebius Token Factory is the
production/demo route. Neither route is allowed to execute business side
effects; the deterministic executor owns those transitions.
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


def is_nvidia_nemotron_model(model: str) -> bool:
    """Return whether a model identifier belongs to the NVIDIA Nemotron family."""

    normalized = model.strip().casefold()
    return normalized.startswith("nemotron") or (
        normalized.startswith("nvidia/") and "nemotron" in normalized
    )


class OpenCode2ApiProvider(Provider):
    name = "opencode2api"
    mode = "free-synthetic"
    default_model = "nemotron-3-ultra-free"

    def __init__(self) -> None:
        self.base_url = os.getenv("NOAH_OPENCODE2API_BASE_URL", "").rstrip("/")
        self.api_key = os.getenv("NOAH_OPENCODE2API_KEY", "")
        self.model = os.getenv("NOAH_OPENCODE2API_MODEL", self.default_model).strip() or self.default_model

    def model_allowed(self) -> bool:
        return is_nvidia_nemotron_model(self.model)

    def configured(self) -> bool:
        return bool(self.base_url) and self.model_allowed()

    def manifest(self) -> dict[str, Any]:
        return {
            **super().manifest(),
            "model_policy": "nvidia-nemotron-only",
            "model_allowed": self.model_allowed(),
        }

    def completions_url(self) -> str:
        if self.base_url.endswith("/chat/completions"):
            return self.base_url
        if self.base_url.endswith("/v1"):
            return self.base_url + "/chat/completions"
        return self.base_url + "/v1/chat/completions"

    async def complete(self, prompt: str, system: str) -> ProviderResult:
        if not self.configured():
            if self.base_url and not self.model_allowed():
                return ProviderResult(self.name, self.model, None, "OPENCODE2API_NON_NVIDIA_MODEL")
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
            response_model = body.get("model")
            if response_model is not None and not is_nvidia_nemotron_model(str(response_model)):
                return ProviderResult(self.name, self.model, None, "OPENCODE2API_NON_NVIDIA_RESPONSE_MODEL")
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


NVIDIA_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"
NVIDIA_NIM_DEFAULT_MODEL = "nvidia/nemotron-3-nano-30b-a3b-reasoning"
REVIEWER_PROVIDER_NAMES = frozenset({"nvidia-nim", "nebius"})


class ReviewerProvider(Provider):
    """Ephemeral, allowlisted OpenAI-compatible route for a reviewer BYOK key.

    The browser can choose a provider and model, but it can never choose the
    destination URL. The API constructs this object for one request and never
    stores the supplied key in a tenant snapshot, audit event, or response.
    """

    mode = "reviewer-byok"

    def __init__(
        self,
        provider: str,
        api_key: str,
        model: str | None = None,
        *,
        nebius_base_url: str | None = None,
    ) -> None:
        if provider not in REVIEWER_PROVIDER_NAMES:
            raise ValueError("REVIEWER_PROVIDER_UNSUPPORTED")
        self.name = provider
        self.api_key = api_key
        default_model = (
            NVIDIA_NIM_DEFAULT_MODEL
            if provider == "nvidia-nim"
            else os.getenv("NOAH_NEBIUS_MODEL", "nvidia/nemotron-3-super-120b-a12b")
        )
        self.model = (model or default_model).strip() or default_model
        base_url = NVIDIA_NIM_BASE_URL if provider == "nvidia-nim" else (
            nebius_base_url or os.getenv("NOAH_NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1")
        )
        self.base_url = base_url.rstrip("/")

    def configured(self) -> bool:
        return bool(self.api_key) and is_nvidia_nemotron_model(self.model)

    def model_allowed(self) -> bool:
        return is_nvidia_nemotron_model(self.model)

    def completions_url(self) -> str:
        if self.base_url.endswith("/chat/completions"):
            return self.base_url
        if self.base_url.endswith("/v1"):
            return self.base_url + "/chat/completions"
        return self.base_url + "/v1/chat/completions"

    async def complete(self, prompt: str, system: str) -> ProviderResult:
        if not self.api_key:
            return ProviderResult(self.name, self.model, None, "REVIEWER_NOT_CONFIGURED")
        if not self.model_allowed():
            return ProviderResult(self.name, self.model, None, "REVIEWER_NON_NVIDIA_MODEL")
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
                    self.completions_url(),
                    headers={"Authorization": "Bearer " + self.api_key, "Content-Type": "application/json"},
                    json=payload,
                )
            response.raise_for_status()
            body = response.json()
            response_model = body.get("model")
            if response_model is not None and not is_nvidia_nemotron_model(str(response_model)):
                return ProviderResult(self.name, self.model, None, "REVIEWER_NON_NVIDIA_RESPONSE_MODEL")
            text = body.get("choices", [{}])[0].get("message", {}).get("content")
            if not text:
                return ProviderResult(self.name, self.model, None, "REVIEWER_EMPTY_RESPONSE")
            return ProviderResult(self.name, self.model, str(text))
        except httpx.HTTPStatusError as exc:
            # Keep only the status code. The request key must never appear in
            # a provider error returned to the browser or persisted in a run.
            return ProviderResult(self.name, self.model, None, f"HTTP_{exc.response.status_code}")
        except httpx.HTTPError:
            return ProviderResult(self.name, self.model, None, "REVIEWER_TRANSPORT_ERROR")
        except ValueError:
            return ProviderResult(self.name, self.model, None, "REVIEWER_INVALID_RESPONSE")


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
