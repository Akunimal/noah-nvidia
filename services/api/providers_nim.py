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


class NemotronReranker:
    """Dedicated NVIDIA retrieval endpoint adapter.

    Ranking is intentionally separate from chat completions. The response is
    normalized to ``index``/``relevance_score`` pairs so the domain layer can
    cite only the selected tenant's chunks.
    """

    def __init__(self) -> None:
        self.base_url = os.getenv(
            "NOAH_RERANKING_BASE_URL",
            "https://ai.api.nvidia.com/v1/retrieval/nvidia/llama-nemotron-rerank-vl-1b-v2/reranking",
        ).rstrip("/")
        self.api_key = os.getenv("NOAH_NVIDIA_NIM_API_KEY", "")
        self.model = os.getenv("NOAH_RERANKING_MODEL", "nvidia/llama-nemotron-rerank-vl-1b-v2")

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    async def rerank(self, query: str, passages: list[str], top_n: int = 5) -> list[dict[str, Any]]:
        if not self.configured:
            raise RuntimeError("NVIDIA_RERANKING_NOT_CONFIGURED")
        if not passages:
            return []
        payload = {"model": self.model, "query": {"text": query}, "passages": [{"text": passage} for passage in passages], "truncate": "END"}
        async with httpx.AsyncClient(timeout=35) as client:
            response = await client.post(self.base_url, headers={"Authorization": "Bearer " + self.api_key, "Content-Type": "application/json"}, json=payload)
        response.raise_for_status()
        body = response.json()
        results = body.get("rankings") or body.get("data") or []
        normalized = []
        for item in results:
            index = int(item.get("index", item.get("document_index", 0)))
            score = float(item.get("relevance_score", item.get("score", 0)))
            normalized.append({"index": index, "relevance_score": score})
        return sorted(normalized, key=lambda item: item["relevance_score"], reverse=True)[:top_n]


class NemotronParser:
    """Optional page parser boundary for scanned documents."""

    def __init__(self) -> None:
        self.base_url = os.getenv("NOAH_PARSE_BASE_URL", "").rstrip("/")
        self.api_key = os.getenv("NOAH_NVIDIA_NIM_API_KEY", "")
        self.model = os.getenv("NOAH_PARSE_MODEL", "nvidia/nemotron-parse")

    @property
    def configured(self) -> bool:
        return bool(self.base_url and self.api_key)

    async def parse_page(self, image_base64: str) -> dict[str, Any]:
        if not self.configured:
            raise RuntimeError("NEMOTRON_PARSE_NOT_CONFIGURED")
        payload = {"model": self.model, "image": image_base64}
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(self.base_url, headers={"Authorization": "Bearer " + self.api_key, "Content-Type": "application/json"}, json=payload)
        response.raise_for_status()
        return response.json()


def nim_manifest() -> dict[str, Any]:
    return {
        "provider": "nvidia-nim",
        "model": os.getenv("NOAH_EMBEDDING_MODEL", "nvidia/nemotron-3-embed-1b"),
        "dimensions": 2048,
        "configured": bool(os.getenv("NOAH_NVIDIA_NIM_API_KEY")),
        "reranking": {
            "model": os.getenv("NOAH_RERANKING_MODEL", "nvidia/llama-nemotron-rerank-vl-1b-v2"),
            "endpoint": os.getenv("NOAH_RERANKING_BASE_URL", "https://ai.api.nvidia.com/v1/retrieval/nvidia/llama-nemotron-rerank-vl-1b-v2/reranking"),
            "configured": bool(os.getenv("NOAH_NVIDIA_NIM_API_KEY")),
        },
        "parse": {
            "model": os.getenv("NOAH_PARSE_MODEL", "nvidia/nemotron-parse"),
            "endpoint": os.getenv("NOAH_PARSE_BASE_URL", ""),
            "configured": bool(os.getenv("NOAH_PARSE_BASE_URL") and os.getenv("NOAH_NVIDIA_NIM_API_KEY")),
        },
    }
