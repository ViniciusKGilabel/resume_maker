import { describe, it, expect } from "vitest";
import { renderResumePdf } from "@/src/pdf/render";
import { extractPdfText } from "@/src/import/extractText";
import { emptyResume, type Resume } from "@/src/types/resume";
import { labels, period } from "@/src/pdf/labels";

describe("period", () => {
  const l = labels("pt-BR");
  it("omits period when there are no dates", () => expect(period("", "", l)).toBe(""));
  it("uses present label when end is empty", () => expect(period("2020", "", l)).toBe("2020 – Atual"));
  it("joins start and end", () => expect(period("2018", "2020", l)).toBe("2018 – 2020"));
});

function sample(): Resume {
  const r = emptyResume();
  r.contact = { name: "Ana Souza", title: "Desenvolvedora Backend", email: "ana@email.com", phone: "(11) 98765-4321", location: "São Paulo", linkedin: "linkedin.com/in/ana", github: "", website: "" };
  r.summary = "Desenvolvedora com seis anos em Node.js e sistemas distribuídos.";
  r.experiences = [
    { company: "Nubank", role: "Backend Sênior", start: "jan 2021", end: "", location: "São Paulo", bullets: ["Desenvolveu APIs de pagamento em Node.js", "Reduziu latência em 40%"] },
    { company: "iFood", role: "Backend", start: "2018", end: "2020", location: "", bullets: ["Migrou MySQL para PostgreSQL"] },
  ];
  r.education = [{ institution: "USP", degree: "Bacharelado em Ciência da Computação", start: "2013", end: "2017" }];
  r.certifications = [{ name: "AWS Developer", issuer: "Amazon", year: "2022" }];
  r.skills = ["Node.js", "TypeScript", "PostgreSQL"];
  r.languages = [{ name: "Inglês", level: "avançado" }];
  return r;
}

describe("renderResumePdf", () => {
  it("two-column renders text PDF with main column before sidebar", async () => {
    const buf = await renderResumePdf(sample(), { template: "two-column", language: "pt-BR" });
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    const text = await extractPdfText(buf);
    expect(text).toContain("Ana Souza");
    expect(text).toContain("Desenvolveu APIs de pagamento em Node.js");
    expect(text.toUpperCase()).toContain("EXPERIÊNCIA PROFISSIONAL");
    expect(text).toContain("Atual");
    // ordem de leitura: resumo (principal) antes do e-mail (lateral)
    expect(text.indexOf("seis anos")).toBeLessThan(text.indexOf("ana@email.com"));
    expect(text.indexOf("Nubank")).toBeLessThan(text.indexOf("PostgreSQL\n"));
  });

  it("single-column renders in english with labels", async () => {
    const buf = await renderResumePdf(sample(), { template: "single-column", language: "en" });
    const text = await extractPdfText(buf);
    expect(text.toUpperCase()).toContain("EXPERIENCE");
    expect(text).toContain("Present");
    expect(text).toContain("Node.js, TypeScript, PostgreSQL");
    expect(text.indexOf("Ana Souza")).toBeLessThan(text.indexOf("Nubank"));
  });

  it("renders an empty resume without crashing", async () => {
    const buf = await renderResumePdf(emptyResume(), { template: "two-column", language: "pt-BR" });
    expect(buf.length).toBeGreaterThan(500);
  });
});
