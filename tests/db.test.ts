import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDb, closeDb } from "@/src/db/connection";
import { resumesRepo } from "@/src/db/resumes";
import { tailoredRepo } from "@/src/db/tailored";
import { settingsRepo } from "@/src/db/settings";
import { emptyResume } from "@/src/types/resume";

beforeEach(() => {
  getDb(":memory:");
});
afterEach(() => closeDb());

describe("resumesRepo", () => {
  it("creates, reads, updates, lists and removes", () => {
    const r = resumesRepo.create({ name: "Meu CV" });
    expect(r.id).toBeTruthy();
    expect(r.language).toBe("pt-BR");
    expect(r.data).toEqual(emptyResume());

    const data = emptyResume();
    data.contact.name = "Ana";
    data.skills = ["node"];
    const updated = resumesRepo.update(r.id, { data, language: "en" })!;
    expect(updated.data.contact.name).toBe("Ana");
    expect(updated.language).toBe("en");
    expect(updated.name).toBe("Meu CV");

    expect(resumesRepo.list().map((x) => x.id)).toEqual([r.id]);
    expect(resumesRepo.remove(r.id)).toBe(true);
    expect(resumesRepo.get(r.id)).toBeNull();
  });

  it("update on missing id returns null", () => {
    expect(resumesRepo.update("nope", { name: "x" })).toBeNull();
  });
});

describe("tailoredRepo", () => {
  it("links to resume and cascades on delete", () => {
    const r = resumesRepo.create({ name: "CV" });
    const data = emptyResume();
    data.summary = "Para Google";
    const t = tailoredRepo.create({ resumeId: r.id, company: "Google", jobTitle: "Backend", jobDescription: "node", links: ["https://x"], provider: "groq", data });
    expect(tailoredRepo.listByResume(r.id)).toHaveLength(1);
    expect(tailoredRepo.get(t.id)!.data.summary).toBe("Para Google");
    expect(tailoredRepo.get(t.id)!.links).toEqual(["https://x"]);
    resumesRepo.remove(r.id);
    expect(tailoredRepo.get(t.id)).toBeNull();
  });
});

describe("settingsRepo", () => {
  it("round-trips JSON and returns fallback when missing", () => {
    expect(settingsRepo.get("x", { a: 1 })).toEqual({ a: 1 });
    settingsRepo.set("x", { providers: [{ id: "p1" }] });
    settingsRepo.set("x", { providers: [{ id: "p2" }] });
    expect(settingsRepo.get("x", null)).toEqual({ providers: [{ id: "p2" }] });
    expect(settingsRepo.getAll()).toEqual({ x: { providers: [{ id: "p2" }] } });
  });
});
