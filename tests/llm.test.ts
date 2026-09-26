import { describe, it, expect, vi, afterEach } from "vitest";
import { extractJson } from "@/src/llm/json";
import { openaiCompatibleDriver } from "@/src/llm/drivers/openaiCompatible";
import { anthropicDriver } from "@/src/llm/drivers/anthropic";
import { polishExperience, tailorResume } from "@/src/llm/service";
import { LlmError, type ProviderConfig } from "@/src/llm/types";
import { emptyResume } from "@/src/types/resume";
import { BANNED_WORDS, styleRules } from "@/src/llm/prompts/style";
import { describeModels, modelHint } from "@/src/llm/modelInfo";
import { PRESETS } from "@/src/llm/presets";

const oa: ProviderConfig = { id: "p", name: "p", kind: "openai-compatible", baseUrl: "https://x.test/v1/", apiKey: "k", model: "m" };
const an: ProviderConfig = { id: "a", name: "a", kind: "anthropic", baseUrl: "https://api.anthropic.com", apiKey: "k", model: "claude-sonnet-5" };

function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn(handler);
  vi.stubGlobal("fetch", fn);
  return fn;
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("extractJson", () => {
  it("parses plain json", () => expect(extractJson('{"a":1}')).toEqual({ a: 1 }));
  it("parses fenced json", () => expect(extractJson('Here:\n```json\n{"a":[1]}\n```\nthanks')).toEqual({ a: [1] }));
  it("parses json surrounded by text", () => expect(extractJson('Sure! {"b":"x"} done.')).toEqual({ b: "x" }));
  it("throws when no json", () => expect(() => extractJson("nope")).toThrow());
});

describe("openaiCompatibleDriver", () => {
  it("posts to chat/completions with bearer and json mode", async () => {
    const f = mockFetch(() => json({ choices: [{ message: { content: '{"ok":true}' } }] }));
    const text = await openaiCompatibleDriver.chat(oa, { system: "s", user: "u" });
    expect(text).toBe('{"ok":true}');
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://x.test/v1/chat/completions");
    const h = init.headers as Record<string, string>;
    expect(h.authorization).toBe("Bearer k");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("m");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0]).toEqual({ role: "system", content: "s" });
  });

  it("retries without response_format when provider rejects it", async () => {
    const f = mockFetch((_u, init) => {
      const body = JSON.parse(init.body as string);
      if (body.response_format) return json({ error: { message: "response_format not supported" } }, 400);
      return json({ choices: [{ message: { content: "{}" } }] });
    });
    await openaiCompatibleDriver.chat(oa, { system: "s", user: "u" });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("maps 401 to LlmError with provider message", async () => {
    mockFetch(() => json({ error: { message: "Invalid API key" } }, 401));
    await expect(openaiCompatibleDriver.chat(oa, { system: "s", user: "u" })).rejects.toMatchObject({ status: 401, message: "Invalid API key" });
  });

  it("explains an empty answer: finish reason and reasoning", async () => {
    mockFetch(() => json({ choices: [{ finish_reason: "length", message: { content: "", reasoning: "thinking..." } }] }));
    await expect(openaiCompatibleDriver.chat(oa, { system: "s", user: "u" })).rejects.toThrow(/finish_reason=length.*raciocínio/);
  });

  it("surfaces an upstream error sent with HTTP 200", async () => {
    mockFetch(() => json({ error: { message: "Provider returned error", code: 502 } }));
    await expect(openaiCompatibleDriver.chat(oa, { system: "s", user: "u" })).rejects.toMatchObject({ status: 502, message: "Provider returned error" });
  });

  it("shows the upstream provider and raw reason behind OpenRouter's generic error", async () => {
    mockFetch(() => json({ error: { message: "Provider returned error", code: 400, metadata: { provider_name: "OpenAI", raw: '{"error":{"message":"Unsupported value: temperature"}}' } } }, 400));
    await expect(openaiCompatibleDriver.chat(oa, { system: "s", user: "u" })).rejects.toThrow(/Provider returned error \[OpenAI\].*Unsupported value: temperature/);
  });

  it("lists models", async () => {
    mockFetch(() => json({ data: [{ id: "b" }, { id: "a" }] }));
    expect(await openaiCompatibleDriver.listModels(oa)).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("reads price and description when the provider sends them (OpenRouter)", async () => {
    mockFetch(() =>
      json({
        data: [
          { id: "x/paid", description: "Big model. Second sentence.", pricing: { prompt: "0.000001", completion: "0.000002" } },
          { id: "x/free:free", description: "", pricing: { prompt: "0", completion: "0" } },
        ],
      }),
    );
    expect(await openaiCompatibleDriver.listModels(oa)).toEqual([
      { id: "x/free:free", free: true },
      { id: "x/paid", free: false, description: "Big model." },
    ]);
  });
});

describe("anthropicDriver", () => {
  it("posts to /v1/messages with x-api-key and version", async () => {
    const f = mockFetch(() => json({ content: [{ type: "text", text: '{"x":1}' }], stop_reason: "end_turn" }));
    const text = await anthropicDriver.chat(an, { system: "s", user: "u" });
    expect(text).toBe('{"x":1}');
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const h = init.headers as Record<string, string>;
    expect(h["x-api-key"]).toBe("k");
    expect(h["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(init.body as string);
    expect(body.system).toBe("s");
    expect(body.messages).toEqual([{ role: "user", content: "u" }]);
    expect(body.temperature).toBeUndefined();
  });

  it("maps refusal to error", async () => {
    mockFetch(() => json({ content: [], stop_reason: "refusal" }));
    await expect(anthropicDriver.chat(an, { system: "s", user: "u" })).rejects.toBeInstanceOf(LlmError);
  });
});

describe("service", () => {
  it("polishExperience validates shape and drops empty bullets", async () => {
    mockFetch(() => json({ choices: [{ message: { content: '{"bullets":["Built X"," ","Led Y"]}' } }] }));
    const r = await polishExperience(oa, { company: "ACME", role: "Dev", start: "2020", end: "2021", location: "", bullets: [], raw: "fiz x e y" }, "en");
    expect(r.bullets).toEqual(["Built X", "Led Y"]);
  });

  it("polishExperience throws when no bullets", async () => {
    mockFetch(() => json({ choices: [{ message: { content: '{"bullets":[]}' } }] }));
    await expect(polishExperience(oa, { company: "", role: "", start: "", end: "", location: "", bullets: [] }, "en")).rejects.toBeInstanceOf(LlmError);
  });

  it("tailorResume keeps contact/education and experience count from original", async () => {
    const original = emptyResume();
    original.contact.name = "Ana";
    original.contact.email = "ana@x.com";
    original.education = [{ institution: "USP", degree: "CS", start: "2010", end: "2014" }];
    original.experiences = [{ company: "ACME", role: "Dev", start: "2020", end: "2021", location: "", bullets: ["old"] }];
    original.skills = ["node", "go"];
    const llmOut = {
      contact: { name: "HACKED", email: "evil@x.com" },
      summary: "Backend engineer focused on Node.",
      experiences: [{ company: "ACME", role: "Dev", bullets: ["new bullet"] }],
      education: [],
      skills: ["go", "node"],
    };
    mockFetch(() => json({ choices: [{ message: { content: JSON.stringify(llmOut) } }] }));
    const t = await tailorResume(oa, original, { company: "Google", title: "Backend", description: "node", links: [], webSearch: false }, "", "en");
    expect(t.contact).toEqual(original.contact);
    expect(t.education).toEqual(original.education);
    expect(t.summary).toBe("Backend engineer focused on Node.");
    expect(t.experiences[0].bullets).toEqual(["new bullet"]);
    expect(t.experiences[0].start).toBe("2020");
    expect(t.skills).toEqual(["go", "node"]);
  });

  it("tailorResume keeps the original custom colors even when the LLM omits style", async () => {
    const original = emptyResume();
    original.contact.name = "Ana";
    original.style = { sidebarBg: "#112233", sidebarText: "#ffffff", mainBg: "#fefefe", mainText: "#000000" };
    mockFetch(() => json({ choices: [{ message: { content: JSON.stringify({ summary: "x" }) } }] }));
    const t = await tailorResume(oa, original, { company: "Google", title: "Backend", description: "node", links: [], webSearch: false }, "", "en");
    expect(t.style).toEqual(original.style);
  });

  it("style rules list banned words and the language", () => {
    const s = styleRules("pt-BR");
    expect(s).toContain("Brazilian Portuguese");
    for (const w of BANNED_WORDS.slice(0, 5)) expect(s).toContain(w);
  });
});

describe("model catalog", () => {
  it("every preset says if it is free and has a short description", () => {
    for (const p of PRESETS) {
      expect(["free", "free-limited", "paid"]).toContain(p.tier);
      expect(p.description.length).toBeGreaterThan(0);
      expect(p.description.length).toBeLessThanOrEqual(90);
    }
  });

  it("gives a hint from the model name without knowing the exact id", () => {
    expect(modelHint("gemini-9.9-flash-lite")).toMatch(/rápido/i);
    expect(modelHint("claude-opus-9")).toMatch(/qualidade/i);
    expect(modelHint("totally-unknown")).toBeUndefined();
  });

  it("uses provider data first, falls back to the preset tier, and lists free ones first", () => {
    const groq = PRESETS.find((p) => p.id === "groq")!;
    const out = describeModels([{ id: "b-70b" }, { id: "a-paid", free: false, description: "From API." }, { id: "c-free", free: true }], groq.baseUrl);
    expect(out.map((m) => m.id)).toEqual(["b-70b", "c-free", "a-paid"]);
    expect(out[0]).toMatchObject({ tier: "free-limited" });
    expect(out[1]).toMatchObject({ tier: "free" });
    expect(out[2]).toMatchObject({ tier: "paid", description: "From API." });
  });

  it("marks tier unknown for a custom base URL", () => {
    expect(describeModels([{ id: "m" }], "https://my.server/v1")[0].tier).toBe("unknown");
  });
});
