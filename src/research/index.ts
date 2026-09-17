import type { JobInput } from "@/src/llm/types";
import { fetchPageText } from "./fetchPage";
import { searchBrave } from "./providers/brave";
import { searchDdg } from "./providers/ddg";
import { searchTavily } from "./providers/tavily";
import type { SearchResult } from "./providers/types";

export interface SearchSettings {
  tavilyKey: string;
  braveKey: string;
}

export interface ResearchDeps {
  fetchPageText: (url: string) => Promise<string>;
  searchTavily: (q: string, key: string) => Promise<SearchResult[]>;
  searchBrave: (q: string, key: string) => Promise<SearchResult[]>;
  searchDdg: (q: string) => Promise<SearchResult[]>;
}

const defaultDeps: ResearchDeps = { fetchPageText: (u) => fetchPageText(u), searchTavily, searchBrave, searchDdg };

const MAX_RESULTS = 4;
const MAX_TOTAL_CHARS = 12000;

export interface ResearchOutput {
  context: string;
  sources: { url: string; ok: boolean }[];
}

/**
 * Monta o contexto de pesquisa para a chamada tailor.
 * Sem links e sem webSearch: retorna contexto vazio, sem nenhuma request.
 */
export async function buildResearchContext(job: JobInput, settings: SearchSettings, deps: ResearchDeps = defaultDeps): Promise<ResearchOutput> {
  const links = job.links.map((l) => l.trim()).filter((l) => /^https?:\/\//.test(l));
  const sources: { url: string; ok: boolean }[] = [];
  const sections: string[] = [];

  let searchResults: SearchResult[] = [];
  if (job.webSearch && (job.company || job.title)) {
    const query = [job.company ? `"${job.company}"` : "", job.title, "vaga OR job OR careers"].filter(Boolean).join(" ");
    searchResults = await runSearch(query, settings, deps);
    for (const r of searchResults.slice(0, MAX_RESULTS)) {
      if (r.snippet) sections.push(`[${r.title}] (${r.url})\n${r.snippet}`);
    }
  }

  const toFetch = [...links, ...searchResults.slice(0, MAX_RESULTS).map((r) => r.url)].filter((u, i, a) => a.indexOf(u) === i);
  const pages = await Promise.allSettled(toFetch.map((u) => deps.fetchPageText(u)));
  pages.forEach((p, i) => {
    const url = toFetch[i];
    if (p.status === "fulfilled" && p.value.trim()) {
      sources.push({ url, ok: true });
      sections.push(`Source: ${url}\n${p.value.trim()}`);
    } else {
      sources.push({ url, ok: false });
    }
  });

  return { context: sections.join("\n\n").slice(0, MAX_TOTAL_CHARS), sources };
}

async function runSearch(query: string, settings: SearchSettings, deps: ResearchDeps): Promise<SearchResult[]> {
  const attempts: (() => Promise<SearchResult[]>)[] = [];
  if (settings.tavilyKey) attempts.push(() => deps.searchTavily(query, settings.tavilyKey));
  if (settings.braveKey) attempts.push(() => deps.searchBrave(query, settings.braveKey));
  attempts.push(() => deps.searchDdg(query));
  for (const attempt of attempts) {
    try {
      const r = await attempt();
      if (r.length) return r;
    } catch {
      /* próximo provider */
    }
  }
  return [];
}
