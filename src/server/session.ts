import { randomBytes } from "node:crypto";

/**
 * Sessões em memória do processo: nada vai para disco. O navegador só recebe um cookie
 * HttpOnly (JS não lê) sem expiração (morre ao fechar o navegador). Reiniciar o servidor apaga tudo.
 */
const COOKIE = "rm_sid";
const IDLE_TTL_MS = 2 * 60 * 60 * 1000;

interface Entry {
  value: unknown;
  seen: number;
}

// globalThis: no dev o Next pode carregar o módulo mais de uma vez; o store precisa ser único.
const g = globalThis as typeof globalThis & { __rmSessions?: Map<string, Entry> };
const store = (g.__rmSessions ??= new Map<string, Entry>());

function sweep(now: number): void {
  for (const [id, e] of store) if (now - e.seen > IDLE_TTL_MS) store.delete(id);
}

function sessionId(req: Request): string | null {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === COOKIE) return v.join("=") || null;
  }
  return null;
}

export function getSession<T>(req: Request): T | null {
  const now = Date.now();
  sweep(now);
  const id = sessionId(req);
  const e = id ? store.get(id) : undefined;
  if (!e) return null;
  e.seen = now;
  return e.value as T;
}

/** Grava na sessão da requisição; devolve Set-Cookie só quando precisou criar uma sessão nova. */
export function setSession(req: Request, value: unknown): { setCookie?: string } {
  const now = Date.now();
  sweep(now);
  const current = sessionId(req);
  if (current && store.has(current)) {
    store.set(current, { value, seen: now });
    return {};
  }
  const id = randomBytes(32).toString("base64url");
  store.set(id, { value, seen: now });
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return { setCookie: `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Strict${secure}` };
}

/** Usado nos testes. */
export function clearSessions(): void {
  store.clear();
}
