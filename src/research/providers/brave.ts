import type { SearchResult } from "./types";

export async function searchBrave(query: string, apiKey: string): Promise<SearchResult[]> {
  const res = await fetch("https://api.search.brave.com/res/v1/web/search?count=5&q=" + encodeURIComponent(query), {
    headers: { accept: "application/json", "x-subscription-token": apiKey },
  });
  if (!res.ok) throw new Error(`Brave HTTP ${res.status}`);
  const data = (await res.json()) as { web?: { results?: { title: string; url: string; description: string }[] } };
  return (data.web?.results ?? []).map((r) => ({ title: r.title, url: r.url, snippet: r.description }));
}
