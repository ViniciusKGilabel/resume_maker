import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDb, closeDb } from "@/src/db/connection";
import { loadSettings, mergeIncoming, publicSettings, saveSettings } from "@/src/server/settings";

beforeEach(() => getDb(":memory:"));
afterEach(() => closeDb());

describe("settings", () => {
  it("masks keys and keeps previous key when masked value comes back", () => {
    const s = saveSettings(mergeIncoming(loadSettings(), {
      providers: [{ id: "p1", name: "Groq", kind: "openai-compatible", baseUrl: "https://g", apiKey: "gsk_secret1234", model: "m" }],
      activeProviderId: "p1",
      search: { tavilyKey: "tvly-abcd", braveKey: "" },
    }));
    const pub = publicSettings(s);
    expect(pub.providers[0].apiKey).toBe("••••1234");
    expect(pub.search.tavilyKey).toBe("••••abcd");

    const again = mergeIncoming(s, { providers: [{ ...pub.providers[0], model: "m2" }], search: pub.search });
    expect(again.providers[0].apiKey).toBe("gsk_secret1234");
    expect(again.providers[0].model).toBe("m2");
    expect(again.search.tavilyKey).toBe("tvly-abcd");
  });

  it("drops active id that no longer exists and falls back to first provider", () => {
    const s = mergeIncoming(loadSettings(), {
      providers: [{ id: "a", name: "A", kind: "openai-compatible", baseUrl: "u", apiKey: "", model: "m" }],
      activeProviderId: "zzz",
    });
    expect(s.activeProviderId).toBe("a");
    expect(s.compareProviderId).toBe("a");
  });

  it("allows clearing compare provider with null", () => {
    const s = mergeIncoming(loadSettings(), {
      providers: [{ id: "a", name: "A", kind: "openai-compatible", baseUrl: "u", apiKey: "", model: "m" }],
      compareProviderId: null,
    });
    expect(s.compareProviderId).toBeNull();
  });
});
