import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parseResumeText, DATE_RANGE } from "@/src/import/heuristics";
import { stripPageMarkers } from "@/src/import/extractText";

const pt = fs.readFileSync(new URL("./fixtures/resume-pt.txt", import.meta.url), "utf8");
const en = fs.readFileSync(new URL("./fixtures/resume-en.txt", import.meta.url), "utf8");

describe("DATE_RANGE", () => {
  it("matches common formats", () => {
    expect("jan 2021 - atual".match(DATE_RANGE)?.slice(1, 3)).toEqual(["jan 2021", "atual"]);
    expect("2013 - 2017".match(DATE_RANGE)?.slice(1, 3)).toEqual(["2013", "2017"]);
    expect("Jun 2016 – May 2019".match(DATE_RANGE)?.slice(1, 3)).toEqual(["Jun 2016", "May 2019"]);
    expect("03/2020 até 12/2021".match(DATE_RANGE)?.slice(1, 3)).toEqual(["03/2020", "12/2021"]);
  });
});

describe("parseResumeText pt-BR", () => {
  const d = parseResumeText(pt);
  it("extracts contact", () => {
    expect(d.contact).toMatchObject({
      name: "Ana Souza",
      title: "Desenvolvedora Backend",
      email: "ana.souza@email.com",
      phone: "(11) 98765-4321",
      linkedin: "linkedin.com/in/anasouza",
      github: "github.com/anasouza",
    });
  });
  it("extracts summary", () => expect(d.summary).toContain("6 anos em Node.js"));
  it("extracts two experiences with company, role, dates and bullets", () => {
    expect(d.experiences).toHaveLength(2);
    expect(d.experiences![0]).toMatchObject({ role: "Desenvolvedora Backend Sênior", company: "Nubank", location: "São Paulo, SP", start: "jan 2021", end: "atual" });
    expect(d.experiences![0].bullets).toEqual(["Desenvolvi APIs em Node.js para o time de pagamentos", "Reduzi latência do serviço de cobrança em 40%"]);
    expect(d.experiences![1]).toMatchObject({ role: "Desenvolvedora Backend", company: "iFood", start: "mar 2018", end: "dez 2020" });
    expect(d.experiences![1].bullets).toHaveLength(2);
  });
  it("extracts education", () => {
    expect(d.education![0]).toMatchObject({ institution: "Universidade de São Paulo", degree: "Bacharelado em Ciência da Computação", start: "2013", end: "2017" });
  });
  it("extracts certifications, skills and languages", () => {
    expect(d.certifications![0]).toMatchObject({ name: "AWS Certified Developer", issuer: "Amazon", year: "2022" });
    expect(d.skills).toEqual(["Node.js", "TypeScript", "PostgreSQL", "Docker", "AWS"]);
    expect(d.languages).toEqual([{ name: "Português", level: "nativo" }, { name: "Inglês", level: "avançado" }]);
  });
});

describe("parseResumeText en", () => {
  const d = parseResumeText(en);
  it("extracts contact without title line", () => {
    expect(d.contact).toMatchObject({ name: "John Doe", email: "john@doe.dev", linkedin: "https://www.linkedin.com/in/johndoe" });
    expect(d.contact!.phone.replace(/\s/g, "")).toBe("+14155550134");
  });
  it("handles company/role on separate lines and inline", () => {
    expect(d.experiences).toHaveLength(2);
    expect(d.experiences![0]).toMatchObject({ company: "Acme Corp", role: "Senior Software Engineer", start: "2019", end: "Present" });
    expect(d.experiences![0].bullets).toEqual(["Built the billing platform in Go", "Mentored 4 engineers"]);
    expect(d.experiences![1]).toMatchObject({ role: "Software Engineer", company: "Globex", location: "Remote" });
  });
  it("extracts education and skills split by semicolon", () => {
    expect(d.education![0]).toMatchObject({ institution: "MIT", degree: "BSc Computer Science" });
    expect(d.skills).toEqual(["Go", "Node.js", "Kubernetes", "PostgreSQL"]);
  });
});

describe("pdf output round-trip quirks", () => {
  it("strips page markers", () => {
    const out = stripPageMarkers("a\n\n-- 1 of 2 --\n\nb\n-- 2 of 2 --\n");
    expect(out).not.toMatch(/-- \d+ of \d+ --/);
    expect(out.split("\n").filter(Boolean)).toEqual(["a", "b"]);
  });
  it("treats uppercase CONTATO as a section and keeps summary clean", () => {
    const d = parseResumeText("Ana\nRESUMO\noi\nCONTATO\nana@x.com\nHABILIDADES\nnode");
    expect(d.summary).toBe("oi");
    expect(d.skills).toEqual(["node"]);
    expect(d.contact!.email).toBe("ana@x.com");
  });
});
