import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import { htmlToText } from "@/src/research/html";
import { parseDdgHtml } from "@/src/research/providers/ddg";
import { buildResearchContext, type ResearchDeps } from "@/src/research/index";

describe("htmlToText", () => {
  it("removes scripts, styles and tags, decodes entities", () => {
    const html = `<html><head><style>p{}</style><script>var x=1</script></head><body><h1>Hi&nbsp;there</h1><p>A &amp; B</p><nav>menu</nav></body></html>`;
    expect(htmlToText(html)).toBe("Hi there\nA & B");
  });
});

describe("parseDdgHtml", () => {
  it("extracts title, real url and snippet", () => {
    const html = fs.readFileSync(new URL("./fixtures/ddg.html", import.meta.url), "utf8");
    const r = parseDdgHtml(html);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ title: "Backend Engineer - Google Careers", url: "https://careers.google.com/jobs/backend", snippet: "Build scalable Node services & APIs." });
    expect(r[1].url).toBe("https://example.com/post");
  });
});

function deps(over: Partial<ResearchDeps> = {}): ResearchDeps {
  return {
    fetchPageText: vi.fn(async (u: string) => `page of ${u}`),
    searchTavily: vi.fn(async () => [{ title: "T", url: "https://t.test/a", snippet: "tav" }]),
    searchBrave: vi.fn(async () => [{ title: "B", url: "https://b.test/a", snippet: "brave" }]),
    searchDdg: vi.fn(async () => [{ title: "D", url: "https://d.test/a", snippet: "ddg" }]),
    ...over,
  };
}
const settings = { tavilyKey: "", braveKey: "" };
const job = { company: "Google", title: "Backend", description: "", links: [] as string[], webSearch: false };

describe("buildResearchContext", () => {
  it("returns empty context and makes no calls when nothing is requested", async () => {
    const d = deps();
    const r = await buildResearchContext(job, settings, d);
    expect(r.context).toBe("");
    expect(d.fetchPageText).not.toHaveBeenCalled();
    expect(d.searchDdg).not.toHaveBeenCalled();
  });

  it("fetches provided links only", async () => {
    const d = deps();
    const r = await buildResearchContext({ ...job, links: ["https://x.test/careers", "not a url"] }, settings, d);
    expect(d.fetchPageText).toHaveBeenCalledTimes(1);
    expect(r.context).toContain("page of https://x.test/careers");
    expect(d.searchDdg).not.toHaveBeenCalled();
  });

  it("uses ddg when webSearch and no keys, and fetches results", async () => {
    const d = deps();
    const r = await buildResearchContext({ ...job, webSearch: true }, settings, d);
    expect(d.searchDdg).toHaveBeenCalled();
    expect(d.searchTavily).not.toHaveBeenCalled();
    expect(r.context).toContain("ddg");
    expect(r.context).toContain("page of https://d.test/a");
  });

  it("prefers tavily when key exists and skips ddg", async () => {
    const d = deps();
    await buildResearchContext({ ...job, webSearch: true }, { tavilyKey: "k", braveKey: "" }, d);
    expect(d.searchTavily).toHaveBeenCalled();
    expect(d.searchDdg).not.toHaveBeenCalled();
  });

  it("falls back to next provider on failure and tolerates page fetch errors", async () => {
    const d = deps({
      searchTavily: vi.fn(async () => { throw new Error("boom"); }),
      fetchPageText: vi.fn(async () => { throw new Error("timeout"); }),
    });
    const r = await buildResearchContext({ ...job, webSearch: true }, { tavilyKey: "k", braveKey: "" }, d);
    expect(d.searchDdg).toHaveBeenCalled();
    expect(r.sources.every((s) => !s.ok)).toBe(true);
    expect(r.context).toContain("ddg"); // snippet ainda entra
  });
});
