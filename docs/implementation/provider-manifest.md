# NVIDIA provider manifest

| Capability | Provider | Default model or package | Runtime contract |
|---|---|---|---|
| Planning and drafting | Nebius Token Factory | nvidia/nemotron-3-super-120b-a12b | OpenAI-compatible chat completions |
| Free synthetic planning | OpenCode2API transport supplied by operator (NVIDIA Nemotron only) | nemotron-3-ultra-free | OpenAI-compatible chat completions with model-family validation |
| Embeddings | NVIDIA NIM | nvidia/nemotron-3-embed-1b | input_type query/passage, 2048 dimensions |
| Orchestration | NVIDIA NeMo Agent Toolkit | 1.8.x | registered tools and typed workflow |
| Guardrails | NVIDIA NeMo Guardrails | 0.24.x | policy boundary before tool execution |
| Document parsing | NVIDIA Nemotron Parse | operator-selected NIM route | parser contract, human review for scans |
| Optional ranking | NVIDIA Llama Nemotron Rerank | operator-selected NIM route | dedicated reranking endpoint |

The runtime manifest is returned by GET /api/v1/bootstrap and
GET /api/v1/providers/health. Missing keys are reported as configuration
state. No non-NVIDIA model fallback is present. A deterministic demo response
is clearly labeled when no model is configured. `NOAH_MODEL_USAGE_LIMIT` can
stop new model calls before they consume the reserved demo budget.

OpenCode2API is a gateway, not an NVIDIA product. It is included only as
transport to an operator-supplied free NVIDIA Nemotron pool. The configured
and returned model identifiers must belong to the Nemotron family; otherwise
the request is rejected. The route is synthetic-only, opt-in, and must never
receive private customer data.
