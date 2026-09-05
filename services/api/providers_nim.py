"""Optional NVIDIA NIM adapters for knowledge retrieval."""

from __future__ import annotations

import os
from typing import Any

import httpx


class NemotronEmbedder:
    def __init__(self) -> None:
        self.base_url = os.getenv("NOAH_EMBEDDING_BASE_URL", "https://integrate.api.nvidia.com/v1").rstrip("/")
        self.api_key = os.getenv("NOAH_NVIDIA_NIM_API_KEY", "")
        self.model = os.getenv("NOAH_EMBEDDING_MODEL", "nvidia/nemotron-3-embed-1b")

    async def embed(self, text: str, input_type: str = "passage") -> list[float]:
        if input_type not in {"passage", "query"}:
            raise ValueError("input_type must be passage or query")
        if not self.api_key:
            raise RuntimeError("NVIDIA_NIM_NOT_CONFIGURED")
        async with httpx.AsyncClient(timeout=35) as client:
            response = await client.post(
                self.base_url + "/embeddings",
                headers={"Authorization": "Bearer " + self.api_key, "Content-Type": "application/json"},
                json={"model": self.model, "input": [text], "input_type": input_type, "encoding_format": "float"},
            )
        response.raise_for_status()
        vector = response.json().get("data", [{}])[0].get("embedding", [])
        if len(vector) != 2048:
            raise ValueError("NVIDIA_EMBEDDING_DIMENSIONS_MISMATCH")
        return [float(value) for value in vector]


def nim_manifest() -> dict[str, Any]:
    return {
        "provider": "nvidia-nim",
        "model": os.getenv("NOAH_EMBEDDING_MODEL", "nvidia/nemotron-3-embed-1b"),
        "dimensions": 2048,
        "configured": bool(os.getenv("NOAH_NVIDIA_NIM_API_KEY")),
    }
