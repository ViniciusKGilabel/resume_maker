import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDb, closeDb } from "@/src/db/connection";
import { settingsRepo } from "@/src/db/settings";
import { clearSessions } from "@/src/server/session";
import { loadSettings, mergeIncoming, publicSettings, saveSettings } from "@/src/server/settings";

beforeEach(() => clearSessions());
afterEach(() => closeDb());

const req = (cookie?: string) => new Request("http://localhost/api/settings", { headers: cookie ? { cookie } : {} });
const cookiePair = (setCookie: string) => setCookie.split(";")[0];

describe("settings", () => {
  it("masks keys and keeps previous key when masked value comes back", () => {
    const s = mergeIncoming(loadSettings(req()), {
      providers: [{ id: "p1", name: "Groq", kind: "openai-compatible", baseUrl: "https://g", apiKey: "gsk_secret1234", model: "m" }],
      activeProviderId: "p1",
      search: { tavilyKey: "tvly-abcd", braveKey: "" },
    });
    const pub = publicSettings(s);
    expect(pub.providers[0].apiKey).toBe("••••1234");
    expect(pub.search.tavilyKey).toBe("••••abcd");

    const again = mergeIncoming(s, { providers: [{ ...pub.providers[0], model: "m2" }], search: pub.search });
    expect(again.providers[0].apiKey).toBe("gsk_secret1234");
    expect(again.providers[0].model).toBe("m2");
    expect(again.search.tavilyKey).toBe("tvly-abcd");
  });

  it("does not reuse a saved key when the base URL changes", () => {
    const s = mergeIncoming(loadSettings(req()), {
      providers: [{ id: "p1", name: "Groq", kind: "openai-compatible", baseUrl: "https://g", apiKey: "gsk_secret1234", model: "m" }],
    });
    const pub = publicSettings(s);
    const moved = mergeIncoming(s, { providers: [{ ...pub.providers[0], baseUrl: "https://evil.example" }] });
    expect(moved.providers[0].apiKey).toBe("");
  });

  it("drops active id that no longer exists and falls back to first provider", () => {
    const s = mergeIncoming(loadSettings(req()), {
      providers: [{ id: "a", name: "A", kind: "openai-compatible", baseUrl: "u", apiKey: "", model: "m" }],
      activeProviderId: "zzz",
    });
    expect(s.activeProviderId).toBe("a");
    expect(s.compareProviderId).toBe("a");
  });

  it("allows clearing compare provider with null", () => {
    const s = mergeIncoming(loadSettings(req()), {
      providers: [{ id: "a", name: "A", kind: "openai-compatible", baseUrl: "u", apiKey: "", model: "m" }],
      compareProviderId: null,
    });
    expect(s.compareProviderId).toBeNull();
  });
});

describe("session-scoped settings", () => {
  const withKey = () =>
    mergeIncoming(loadSettings(req()), {
      providers: [{ id: "p1", name: "Groq", kind: "openai-compatible", baseUrl: "https://g", apiKey: "gsk_secret1234", model: "m" }],
      activeProviderId: "p1",
    });

  it("starts empty without a session cookie", () => {
    expect(loadSettings(req()).providers).toEqual([]);
  });

  it("saves into the session and sets an HttpOnly, SameSite=Strict cookie without expiry", () => {
    const { setCookie } = saveSettings(req(), withKey());
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Strict/);
    expect(setCookie).not.toMatch(/Max-Age|Expires/i);
    expect(loadSettings(req(cookiePair(setCookie!))).providers[0].apiKey).toBe("gsk_secret1234");
  });

  it("isolates sessions and ignores unknown session ids", () => {
    const { setCookie } = saveSettings(req(), withKey());
    const other = saveSettings(req(), loadSettings(req()));
    expect(loadSettings(req(cookiePair(other.setCookie!))).providers).toEqual([]);
    expect(loadSettings(req("rm_sid=forged")).providers).toEqual([]);
    expect(loadSettings(req(cookiePair(setCookie!))).providers).toHaveLength(1);
  });

  it("reuses the existing session id instead of issuing a new cookie", () => {
    const { setCookie } = saveSettings(req(), withKey());
    const again = saveSettings(req(cookiePair(setCookie!)), withKey());
    expect(again.setCookie).toBeUndefined();
  });

  it("never writes settings to the database", () => {
    getDb(":memory:");
    saveSettings(req(), withKey());
    expect(settingsRepo.getAll()).toEqual({});
  });
});

describe("legacy stored settings", () => {
  it("are purged (keys used to be stored in plain text)", () => {
    getDb(":memory:").prepare("INSERT INTO settings (key, value) VALUES ('app', '{}')").run();
    settingsRepo.purgeLegacyApp();
    expect(settingsRepo.get("app", null)).toBeNull();
  });
});
