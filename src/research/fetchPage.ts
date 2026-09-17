import { htmlToText } from "./html";

export interface FetchPageOptions {
  timeoutMs?: number;
  maxChars?: number;
}

const UA = "Mozilla/5.0 (compatible; ResumeMaker/1.0)";

export async function fetchText(url: string, timeoutMs = 8000): Promise<{ contentType: string; body: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": UA, accept: "text/html,application/json;q=0.9,*/*;q=0.8" }, redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { contentType: res.headers.get("content-type") ?? "", body: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

/** Baixa uma página e devolve texto limpo, limitado a maxChars. */
export async function fetchPageText(url: string, opts: FetchPageOptions = {}): Promise<string> {
  const { timeoutMs = 8000, maxChars = 3000 } = opts;
  const { contentType, body } = await fetchText(url, timeoutMs);
  const text = /html/i.test(contentType) || /<html/i.test(body.slice(0, 500)) ? htmlToText(body) : body;
  return text.slice(0, maxChars);
}
