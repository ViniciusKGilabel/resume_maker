import { LlmError, type ChatRequest, type LlmDriver, type ProviderConfig } from "../types";

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

async function readError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
    if (typeof j.error === "string") return j.error;
    return j.error?.message ?? j.message ?? text;
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
    const data = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new LlmError(502, "Provider retornou resposta vazia");
    return content;
  },

  async listModels(p) {
    const res = await fetch(url(p.baseUrl, "/models"), { headers: headers(p) });
    if (!res.ok) throw new LlmError(res.status, await readError(res));
    const data = (await res.json()) as { data?: { id: string }[] };
    const ids = (data.data ?? []).map((m) => m.id);
    return ids.sort();
  },
};
