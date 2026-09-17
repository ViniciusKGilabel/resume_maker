import { decodeEntities } from "../html";
import { fetchText } from "../fetchPage";
import type { SearchResult } from "./types";

/** Extrai resultados do HTML de html.duckduckgo.com. */
export function parseDdgHtml(html: string): SearchResult[] {
  const out: SearchResult[] = [];
  const strip = (s: string) => decodeEntities(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
  const anchorRe = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const anchors: { url: string; title: string; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html))) {
    let url = decodeEntities(m[1]);
    // Links de redirecionamento do DDG: //duckduckgo.com/l/?uddg=<url>
    const uddg = url.match(/[?&]uddg=([^&]+)/);
    if (uddg) url = decodeURIComponent(uddg[1]);
    if (url.startsWith("//")) url = "https:" + url;
    if (!/^https?:\/\//.test(url)) continue;
    anchors.push({ url, title: strip(m[2]), end: anchorRe.lastIndex });
  }
  anchors.forEach((a, i) => {
    const block = html.slice(a.end, anchors[i + 1]?.end ?? html.length);
    const sn = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
    out.push({ title: a.title, url: a.url, snippet: sn ? strip(sn[1]) : "" });
  });
  return out;
}

export async function searchDdg(query: string): Promise<SearchResult[]> {
  const { body } = await fetchText("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query));
  return parseDdgHtml(body);
}
