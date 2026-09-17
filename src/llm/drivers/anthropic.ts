import { LlmError, type ChatRequest, type LlmDriver, type ProviderConfig } from "../types";

const VERSION = "2023-06-01";

function url(base: string, path: string): string {
  return base.replace(/\/+$/, "") + path;
}

function headers(p: ProviderConfig): Record<string, string> {
  return { "content-type": "application/json", "x-api-key": p.apiKey, "anthropic-version": VERSION };
}

async function readError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { error?: { message?: string } };
    return j.error?.message ?? text;
  } catch {
    return text || res.statusText;
  }
}

export const anthropicDriver: LlmDriver = {
  async chat(p, req) {
    const body = {
      model: p.model,
      max_tokens: req.maxTokens ?? 4000,
      system: req.system,
      // Menor custo: esforço baixo é suficiente para reescrita de texto.
      output_config: { effort: "low" },
      messages: [{ role: "user", content: req.user }],
    };
    const res = await fetch(url(p.baseUrl, "/v1/messages"), { method: "POST", headers: headers(p), body: JSON.stringify(body) });
    if (!res.ok) throw new LlmError(res.status, await readError(res));
    const data = (await res.json()) as { content?: { type: string; text?: string }[]; stop_reason?: string };
    if (data.stop_reason === "refusal") throw new LlmError(502, "O modelo recusou a solicitação");
    const text = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    if (!text) throw new LlmError(502, "Provider retornou resposta vazia");
    return text;
  },

  async listModels(p) {
    const res = await fetch(url(p.baseUrl, "/v1/models?limit=100"), { headers: headers(p) });
    if (!res.ok) throw new LlmError(res.status, await readError(res));
    const data = (await res.json()) as { data?: { id: string }[] };
    return (data.data ?? []).map((m) => m.id).sort();
  },
};
