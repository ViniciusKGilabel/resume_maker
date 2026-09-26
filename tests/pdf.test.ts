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

/** Posição (x) e largura de cada trecho de texto da página 1, em pontos. */
async function textBoxes(buf: Buffer): Promise<{ str: string; x: number; right: number; y: number }[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const content = await (await doc.getPage(1)).getTextContent();
  return content.items
    .filter((i): i is typeof i & { str: string; transform: number[]; width: number } => "str" in i && i.str.trim() !== "")
    .map((i) => ({ str: i.str, x: i.transform[4], right: i.transform[4] + i.width, y: i.transform[5] }));
}

describe("two-column sidebar", () => {
  const SIDEBAR_CONTENT_RIGHT = 168 - 16; // largura da lateral menos o padding

  it("wraps long links (LinkedIn/GitHub) inside the sidebar and keeps them readable", async () => {
    const r = sample();
    r.contact.linkedin = "https://www.linkedin.com/in/ana-souza-desenvolvedora-backend-123456";
    r.contact.github = "https://github.com/ana-souza-desenvolvedora";
    const buf = await renderResumePdf(r, { template: "two-column", language: "pt-BR" });
    const side = (await textBoxes(buf)).filter((b) => b.x < 168);
    const overflow = side.filter((b) => b.right > SIDEBAR_CONTENT_RIGHT + 0.5);
    expect(overflow.map((b) => b.str)).toEqual([]);
    // Nada de hífen inventado na quebra, e o link inteiro continua extraível.
    const text = (await extractPdfText(buf)).replace(/\s+/g, "");
    expect(text).toContain("linkedin.com/in/ana-souza-desenvolvedora-backend-123456");
    expect(text).toContain("github.com/ana-souza-desenvolvedora");
  });

  it("wraps a link segment with no separators that is wider than the column", async () => {
    const r = sample();
    r.contact.linkedin = "linkedin.com/in/anasouzadesenvolvedorabackendsenior2024";
    const buf = await renderResumePdf(r, { template: "two-column", language: "pt-BR" });
    const side = (await textBoxes(buf)).filter((b) => b.x < 168);
    expect(side.filter((b) => b.right > SIDEBAR_CONTENT_RIGHT + 0.5).map((b) => b.str)).toEqual([]);
    expect((await extractPdfText(buf)).replace(/\s+/g, "")).toContain("linkedin.com/in/anasouzadesenvolvedorabackendsenior2024");
  });

  it("leaves space between the name and the professional title", async () => {
    const boxes = await textBoxes(await renderResumePdf(sample(), { template: "two-column", language: "pt-BR" }));
    const name = boxes.find((b) => b.str.includes("Ana Souza"))!;
    const title = boxes.find((b) => b.str.includes("Desenvolvedora Backend"))!;
    // Distância entre as linhas de base; antes da correção era ~7pt (título colado no nome).
    expect(name.y - title.y).toBeGreaterThanOrEqual(12);
  });
});
