import { randomUUID } from "node:crypto";
import { settingsRepo } from "@/src/db/settings";
import { PRESETS } from "@/src/llm/presets";
import type { ProviderConfig, ProviderKind } from "@/src/llm/types";
import { HttpError } from "./errors";

export interface AppSettings {
  providers: ProviderConfig[];
  activeProviderId: string | null;
  compareProviderId: string | null;
  search: { tavilyKey: string; braveKey: string };
}

const KEY = "app";
const MASK = "••••";

function defaults(): AppSettings {
  return { providers: [], activeProviderId: null, compareProviderId: null, search: { tavilyKey: "", braveKey: "" } };
}

/** Seed a partir do .env na primeira carga (LLM_KIND, LLM_BASE_URL, LLM_API_KEY, LLM_MODEL, TAVILY_API_KEY, BRAVE_API_KEY). */
function seedFromEnv(s: AppSettings): AppSettings {
  const env = process.env;
  if (s.providers.length === 0 && (env.LLM_API_KEY || env.LLM_BASE_URL)) {
    const kind: ProviderKind = env.LLM_KIND === "anthropic" ? "anthropic" : "openai-compatible";
    const preset = PRESETS.find((p) => p.kind === kind && (!env.LLM_BASE_URL || p.baseUrl === env.LLM_BASE_URL));
    const p: ProviderConfig = {
      id: randomUUID(),
      name: env.LLM_NAME || preset?.name || "Provider (.env)",
      kind,
      baseUrl: env.LLM_BASE_URL || preset?.baseUrl || PRESETS[0].baseUrl,
      apiKey: env.LLM_API_KEY || "",
      model: env.LLM_MODEL || preset?.model || PRESETS[0].model,
    };
    s.providers.push(p);
    s.activeProviderId = p.id;
  }
  if (!s.search.tavilyKey && env.TAVILY_API_KEY) s.search.tavilyKey = env.TAVILY_API_KEY;
  if (!s.search.braveKey && env.BRAVE_API_KEY) s.search.braveKey = env.BRAVE_API_KEY;
  return s;
}

export function loadSettings(): AppSettings {
  const stored = settingsRepo.get<AppSettings | null>(KEY, null);
  if (stored) return { ...defaults(), ...stored, search: { ...defaults().search, ...stored.search } };
  const seeded = seedFromEnv(defaults());
  settingsRepo.set(KEY, seeded);
  return seeded;
}

export function saveSettings(s: AppSettings): AppSettings {
  settingsRepo.set(KEY, s);
  return s;
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
    const apiKey = typeof p.apiKey === "string" && isMasked(p.apiKey) ? (prev?.apiKey ?? "") : (p.apiKey ?? "");
    const kind: ProviderKind = p.kind === "anthropic" ? "anthropic" : "openai-compatible";
    return {
      id: p.id || randomUUID(),
      name: String(p.name ?? "").trim() || "Provider",
      kind,
      baseUrl: String(p.baseUrl ?? "").trim(),
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
  if (!p) throw new HttpError(400, "Nenhum provider de LLM configurado. Abra Configurações e adicione um.");
  if (!p.baseUrl || !p.model) throw new HttpError(400, `Provider "${p.name}" sem URL ou modelo.`);
  return p;
}
