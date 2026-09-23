# NVIDIA provider manifest

| Capability | Provider | Default model or package | Runtime contract |
|---|---|---|---|
| Planning and drafting | Nebius Token Factory | nvidia/nemotron-3-super-120b-a12b | OpenAI-compatible chat completions |
| Public reviewer fallback | NVIDIA NIM or Nebius (fixed server destinations) | NVIDIA Nemotron only | Ephemeral BYOK header, no Noah call-count cap, never persisted |
| Free synthetic planning | OpenCode2API transport supplied by operator (NVIDIA Nemotron only) | nemotron-3-ultra-free | OpenAI-compatible chat completions with model-family validation |
| Embeddings | NVIDIA NIM | nvidia/nemotron-3-embed-1b | input_type query/passage, 2048 dimensions |
| Orchestration | NVIDIA NeMo Agent Toolkit | 1.8.x | registered tools and typed workflow |
| Guardrails | NVIDIA NeMo Guardrails | 0.24.x | policy boundary before tool execution |
| Document parsing | NVIDIA Nemotron Parse | operator-selected NIM route | parser contract, human review for scans |
| Optional ranking | NVIDIA Llama Nemotron Rerank | operator-selected NIM route | dedicated reranking endpoint |

The runtime manifest is returned by GET /api/v1/bootstrap and
GET /api/v1/providers/health. Missing keys are reported as configuration
state. No non-NVIDIA model fallback is present. A deterministic demo response
is clearly labeled when no model is configured. `NOAH_MODEL_USAGE_LIMIT` only
applies to non-public tenant model calls; it does not cap the public funded or
reviewer BYOK routes.

The public Render demo is synthetic by default. `NOAH_PUBLIC_AI_MODE=scheduled`
opens the server-funded Nebius/Nemotron route only inside the configured UTC
window (`NOAH_PUBLIC_AI_OPEN_AT` to `NOAH_PUBLIC_AI_DEADLINE_AT`); the app
does not impose total or daily call caps on that route. Neon records usage and
reservations and durably remembers provider-reported credit exhaustion, so API
restarts cannot clear that state. When Nebius rejects a request for exhausted
credit/quota, the funded route stops and the UI offers the reviewer BYOK route;
the deterministic sandbox remains available. A temporary 429 rate-limit
response alone does not mark credit exhausted. A reviewer may optionally
provide an NVIDIA NIM or Nebius key for that browser session; the backend
chooses the fixed endpoint, accepts only Nemotron models, imposes no Noah
call-count cap, and never stores or logs the key. The provider's own limits
and billing apply to that key.

Noah cannot tell promotional usage from paid usage. Before opening the funded
route, configure a provider-side hard spend guard or ensure Nebius rejects
calls when promotional credit is depleted; app-level funded-call caps are
intentionally disabled.

OpenCode2API is a gateway, not an NVIDIA product. It is included only as
transport to an operator-supplied free NVIDIA Nemotron pool. The configured
and returned model identifiers must belong to the Nemotron family; otherwise
the request is rejected. The route is synthetic-only, opt-in, and must never
receive private customer data.
