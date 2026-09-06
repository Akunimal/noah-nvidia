function configuredValue(name) {
  return (process.env[name] || "").trim();
}

export default class NoahApiOnboardingProvider {
  id() {
    return "noah-api-onboarding";
  }

  async callApi(_prompt, context = {}) {
    const baseUrl = configuredValue("NOAH_EVAL_API_BASE_URL").replace(/\/$/, "");
    const bearer = configuredValue("NOAH_EVAL_API_BEARER");
    const publicWorkspace = configuredValue("NOAH_EVAL_PUBLIC_WORKSPACE");
    if (!baseUrl) throw new Error("NOAH_EVAL_API_BASE_URL is required");
    if (!bearer && !publicWorkspace) {
      throw new Error("NOAH_EVAL_API_BEARER or NOAH_EVAL_PUBLIC_WORKSPACE is required");
    }

    const input = typeof context.vars?.input === "string" ? context.vars.input : "";
    const headers = { "Content-Type": "application/json" };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    if (publicWorkspace) headers["X-Noah-Public-Workspace"] = publicWorkspace;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    let response;
    try {
      response = await fetch(`${baseUrl}/api/v1/onboarding/extract`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text: input }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("NOAH_EVAL_API_TIMEOUT");
      throw new Error("NOAH_EVAL_API_TRANSPORT_ERROR");
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) throw new Error(`NOAH_EVAL_API_HTTP_${response.status}`);
    let body;
    try {
      body = await response.json();
    } catch {
      throw new Error("NOAH_EVAL_API_INVALID_JSON");
    }
    if (!body?.draft || !body?.provenance) throw new Error("NOAH_EVAL_API_CONTRACT_ERROR");

    const endpoint = new URL(`${baseUrl}/api/v1/onboarding/extract`);
    return {
      output: JSON.stringify(body.draft),
      metadata: {
        provider: body.provenance.provider,
        model: body.provenance.model,
        synthetic: false,
        external_effects: false,
        api_endpoint: endpoint.origin,
        http_status: response.status,
      },
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
    };
  }
}
