import { LlmError, type ChatRequest, type LlmDriver, type ModelInfo, type ProviderConfig } from "../types";

function url(base: string, path: string): string {
  return base.replace(/\/+$/, "") + path;
}

function headers(p: ProviderConfig): Record<string, string> {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (p.apiKey) h.authorization = `Bearer ${p.apiKey}`;
  if (p.baseUrl.includes("openrouter.ai")) {
    h["http-referer"] = "https://github.com/resume-maker";
    h["x-title"] = "Resume Maker";
  }
  return h;
}

type ApiError = { message?: string; code?: number; metadata?: { provider_name?: string; raw?: unknown } };

/** OpenRouter embrulha o erro real do provider de origem em metadata; sem isso só sobra "Provider returned error". */
function describeError(e: ApiError): string {
  let msg = e.message ?? "Erro do provider";
  const provider = e.metadata?.provider_name;
  if (provider) msg += ` [${provider}]`;
  const raw = e.metadata?.raw;
  if (raw) {
    let detail = typeof raw === "string" ? raw : JSON.stringify(raw);
    try {
      const j = JSON.parse(detail) as { error?: { message?: string } | string; message?: string };
      detail = (typeof j.error === "string" ? j.error : j.error?.message) ?? j.message ?? detail;
    } catch {
      /* raw não é JSON: usa como veio */
    }
    msg += `: ${detail.slice(0, 300)}`;
  }
  return msg;
}

async function readError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { error?: ApiError | string; message?: string };
    if (typeof j.error === "string") return j.error;
    if (j.error) return describeError(j.error);
    return j.message ?? text;
  } catch {
    return text || res.statusText;
  }
}

async function post(p: ProviderConfig, req: ChatRequest, jsonMode: boolean): Promise<Response> {
  const body: Record<string, unknown> = {
    model: p.model,
    temperature: 0.3,
    max_tokens: req.maxTokens ?? 4000,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
  };
  if (jsonMode) body.response_format = { type: "json_object" };
  return fetch(url(p.baseUrl, "/chat/completions"), { method: "POST", headers: headers(p), body: JSON.stringify(body) });
}

export const openaiCompatibleDriver: LlmDriver = {
  async chat(p, req) {
    let res = await post(p, req, true);
    // Alguns modelos free rejeitam response_format; tenta sem.
    if (res.status === 400) {
      const msg = await readError(res);
      if (/response_format|json/i.test(msg)) res = await post(p, req, false);
      else throw new LlmError(400, msg);
    }
    if (!res.ok) throw new LlmError(res.status, await readError(res));
    const data = (await res.json()) as {
      error?: ApiError;
      choices?: { finish_reason?: string; message?: { content?: string | null; reasoning?: string | null } }[];
    };
    // OpenRouter às vezes devolve erro do provider de origem com HTTP 200.
    if (data.error && !data.choices?.length) throw new LlmError(data.error.code && data.error.code >= 400 ? data.error.code : 502, describeError(data.error));
    const choice = data.choices?.[0];
    const content = choice?.message?.content;
    if (!content) {
      const why = [`finish_reason=${choice?.finish_reason ?? "?"}`];
      if (choice?.message?.reasoning) why.push("o modelo gastou a resposta em raciocínio");
      throw new LlmError(502, `Provider retornou resposta vazia (${why.join("; ")})`);
    }
    return content;
  },

  async listModels(p) {
    const res = await fetch(url(p.baseUrl, "/models"), { headers: headers(p) });
    if (!res.ok) throw new LlmError(res.status, await readError(res));
    const data = (await res.json()) as { data?: { id: string; description?: string; pricing?: { prompt?: string; completion?: string } }[] };
    return (data.data ?? [])
      .map((m): ModelInfo => {
        const info: ModelInfo = { id: m.id };
        if (m.pricing) info.free = Number(m.pricing.prompt) === 0 && Number(m.pricing.completion) === 0;
        const first = m.description?.trim().split(/(?<=\.)\s/)[0];
        if (first) info.description = first.length > 140 ? first.slice(0, 139) + "…" : first;
        return info;
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  },
};
