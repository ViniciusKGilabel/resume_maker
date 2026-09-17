import { describe, it, expect } from "vitest";
import { emptyResume, normalizeResume } from "@/src/types/resume";

describe("resume types", () => {
  it("emptyResume has empty collections and strings", () => {
    const r = emptyResume();
    expect(r.experiences).toEqual([]);
    expect(r.skills).toEqual([]);
    expect(r.contact.name).toBe("");
    expect(r.summary).toBe("");
  });

  it("normalizeResume fills missing fields and drops garbage", () => {
    const r = normalizeResume({
      contact: { name: "Ana", email: 1 },
      experiences: [{ company: "ACME", bullets: ["a", "", 3] }],
      skills: ["node", 5],
      summary: null,
    });
    expect(r.contact).toMatchObject({ name: "Ana", email: "" });
    expect(r.experiences[0].bullets).toEqual(["a"]);
    expect(r.skills).toEqual(["node"]);
    expect(r.summary).toBe("");
    expect(r.education).toEqual([]);
  });

  it("normalizeResume tolerates non-objects", () => {
    expect(normalizeResume(null)).toEqual(emptyResume());
    expect(normalizeResume("x")).toEqual(emptyResume());
  });
});
