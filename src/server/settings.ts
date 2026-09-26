import { randomUUID } from "node:crypto";
import type { ProviderConfig, ProviderKind } from "@/src/llm/types";
import { HttpError } from "./errors";
import { getSession, setSession } from "./session";

export interface AppSettings {
  providers: ProviderConfig[];
  activeProviderId: string | null;
  compareProviderId: string | null;
  search: { tavilyKey: string; braveKey: string };
}

const MASK = "••••";

function defaults(): AppSettings {
  return { providers: [], activeProviderId: null, compareProviderId: null, search: { tavilyKey: "", braveKey: "" } };
}

/** Configuração de IA vive só na sessão (memória do servidor), nunca em disco. */
export function loadSettings(req: Request): AppSettings {
  return getSession<AppSettings>(req) ?? defaults();
}

export function saveSettings(req: Request, s: AppSettings): { settings: AppSettings; setCookie?: string } {
  return { settings: s, ...setSession(req, s) };
}

export function maskKey(k: string): string {
  if (!k) return "";
  return MASK + k.slice(-4);
}

function isMasked(k: string): boolean {
  return k.startsWith(MASK);
}

/** Versão segura para o cliente: chaves mascaradas. */
export function publicSettings(s: AppSettings): AppSettings {
  return {
    ...s,
    providers: s.providers.map((p) => ({ ...p, apiKey: maskKey(p.apiKey) })),
    search: { tavilyKey: maskKey(s.search.tavilyKey), braveKey: maskKey(s.search.braveKey) },
  };
}

/** Aplica um PUT vindo do cliente: chaves mascaradas mantêm o valor anterior. */
export function mergeIncoming(current: AppSettings, incoming: Partial<AppSettings>): AppSettings {
  const prevById = new Map(current.providers.map((p) => [p.id, p]));
  const providers = (incoming.providers ?? current.providers).map((p) => {
    const prev = prevById.get(p.id);
    const baseUrl = String(p.baseUrl ?? "").trim();
    // Chave mascarada só é reaproveitada no mesmo endereço: trocar a URL não pode mandar a chave salva para outro servidor.
    const keepPrev = prev && prev.baseUrl === baseUrl ? prev.apiKey : "";
    const apiKey = typeof p.apiKey === "string" && isMasked(p.apiKey) ? keepPrev : (p.apiKey ?? "");
    const kind: ProviderKind = p.kind === "anthropic" ? "anthropic" : "openai-compatible";
    return {
      id: p.id || randomUUID(),
      name: String(p.name ?? "").trim() || "Provider",
      kind,
      baseUrl,
      apiKey,
      model: String(p.model ?? "").trim(),
    };
  });
  const ids = new Set(providers.map((p) => p.id));
  const pick = (v: string | null | undefined, fallback: string | null) => (v && ids.has(v) ? v : fallback && ids.has(fallback) ? fallback : (providers[0]?.id ?? null));
  const search = {
    tavilyKey: incoming.search?.tavilyKey !== undefined && !isMasked(incoming.search.tavilyKey) ? incoming.search.tavilyKey.trim() : current.search.tavilyKey,
    braveKey: incoming.search?.braveKey !== undefined && !isMasked(incoming.search.braveKey) ? incoming.search.braveKey.trim() : current.search.braveKey,
  };
  return {
    providers,
    activeProviderId: pick(incoming.activeProviderId, current.activeProviderId),
    compareProviderId: incoming.compareProviderId === null ? null : (pick(incoming.compareProviderId, current.compareProviderId) ?? null),
    search,
  };
}

export function resolveProvider(s: AppSettings, id: string | null | undefined): ProviderConfig {
  const p = s.providers.find((x) => x.id === id);
  if (!p) throw new HttpError(400, "Nenhum provider de LLM configurado nesta sessão. Abra ⚙ Configurações e adicione um.");
  if (!p.baseUrl || !p.model) throw new HttpError(400, `Provider "${p.name}" sem URL ou modelo.`);
  return p;
}
