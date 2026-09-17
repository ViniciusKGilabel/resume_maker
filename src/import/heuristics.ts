import type { Certification, Education, Experience, Resume } from "@/src/types/resume";

type SectionKey = "summary" | "experience" | "education" | "certifications" | "skills" | "languages" | "contact" | "other";

const SECTION_TITLES: Record<SectionKey, RegExp> = {
  summary: /^(resumo|sumário|perfil|sobre( mim)?|objetivo|summary|profile|about( me)?|objective|professional summary)$/i,
  experience: /^(experiência(s)?( profissional(is)?)?|histórico profissional|experience|work experience|professional experience|employment( history)?|career)$/i,
  education: /^(formação( acadêmica)?|educação|escolaridade|education|academic background)$/i,
  certifications: /^(certificações|certificados|cursos( e certificações)?|certifications?|courses|licenses( & certifications)?)$/i,
  skills: /^(habilidades|competências|skills|technical skills|tecnologias|technologies|stack|ferramentas|tools|hard skills)$/i,
  languages: /^(idiomas|línguas|languages)$/i,
  contact: /^(contato|contatos|contact|contact info(rmation)?|informações de contato|dados pessoais|personal (info|details))$/i,
  other: /$^/,
};

const MONTH = "(?:jan|fev|feb|mar|abr|apr|mai|may|jun|jul|ago|aug|set|sep|out|oct|nov|dez|dec)[a-zç]*\\.?";
const DATE = `(?:${MONTH}\\s*(?:de\\s*)?/?\\s*)?(?:19|20)\\d{2}|(?:0?[1-9]|1[0-2])/(?:19|20)\\d{2}`;
const PRESENT = "atual|atualmente|presente|present|current|now|hoje";
export const DATE_RANGE = new RegExp(`(${DATE})\\s*(?:-|–|—|a|até|to)\\s*(${DATE}|${PRESENT})`, "i");

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_CANDIDATE = /\+?[\d()][\d()\s.-]{7,22}\d/g;

function findPhone(text: string): string {
  for (const m of text.match(PHONE_CANDIDATE) ?? []) {
    const digits = m.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 13 && !/^(19|20)\d{2}\D+(19|20)\d{2}$/.test(m.trim())) return m.trim();
  }
  return "";
}
const PHONE = { test: (s: string) => findPhone(s) !== "" };
const LINKEDIN = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w%-]+\/?/i;
const GITHUB = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+\/?/i;
const BULLET = /^\s*[-•·*▪◦●–]\s+/;

function detectSection(line: string): SectionKey | null {
  const clean = line.replace(/[:\-–—]+$/, "").trim();
  if (clean.length > 40 || clean.split(/\s+/).length > 4) return null;
  for (const key of Object.keys(SECTION_TITLES) as SectionKey[]) {
    if (key !== "other" && SECTION_TITLES[key].test(clean)) return key;
  }
  return null;
}

function splitSections(lines: string[]): { key: SectionKey; lines: string[] }[] {
  const out: { key: SectionKey; lines: string[] }[] = [{ key: "other", lines: [] }];
  for (const line of lines) {
    const key = detectSection(line);
    if (key) out.push({ key, lines: [] });
    else out[out.length - 1].lines.push(line);
  }
  return out;
}

function parseExperiences(lines: string[]): Experience[] {
  const exps: Experience[] = [];
  const clean = lines.map((l) => l.trim()).filter(Boolean);
  let current: Experience | null = null;
  let pendingHeader: string[] = [];

  const flush = () => {
    if (current) exps.push(current);
    current = null;
  };
  const isHeaderOfNext = (i: number) => {
    // Linha curta, sem bullet, seguida (em até 2 linhas) por uma faixa de datas.
    const line = clean[i];
    if (BULLET.test(line) || DATE_RANGE.test(line) || line.length > 80) return false;
    return [clean[i + 1], clean[i + 2]].some((n) => n && DATE_RANGE.test(n) && !BULLET.test(n));
  };

  for (let i = 0; i < clean.length; i++) {
    const line = clean[i];
    const range = line.match(DATE_RANGE);
    if (range) {
      flush();
      const rest = line.replace(range[0], "").replace(/[|•·,\-–—()\s]+$/g, "").replace(/^[|•·,\-–—()\s]+/g, "").trim();
      const header = [...pendingHeader, rest].filter(Boolean);
      pendingHeader = [];
      const { role, company, location } = splitHeader(header);
      current = { company, role, start: range[1], end: range[2], location, bullets: [], raw: "" };
      continue;
    }
    if (!current || isHeaderOfNext(i)) {
      if (current && pendingHeader.length === 0) flush();
      pendingHeader.push(line);
      if (pendingHeader.length > 2) pendingHeader.shift();
      continue;
    }
    if (BULLET.test(line)) current.bullets.push(line.replace(BULLET, "").trim());
    else if (current.bullets.length === 0 && !current.company && line.length < 80) {
      const { role, company, location } = splitHeader([line]);
      current.company = company || current.company;
      current.role = current.role || role;
      current.location = current.location || location;
    } else current.bullets.push(line);
  }
  flush();
  for (const e of exps) e.raw = e.bullets.join("\n");
  return exps;
}

const ROLE_WORDS = /engineer|engenheir|developer|desenvolvedor|programador|analista|analyst|gerente|manager|lead|líder|architect|arquitet|designer|s[êe]nior|junior|júnior|pleno|estagi[áa]ri|intern|trainee|coordenador|coordinator|cientista|scientist|consultor|consultant|especialista|specialist|head|cto|ceo|diretor|director|tech|dev\b|qa\b|tester|product owner|scrum|devops|sre|suporte|support|assistente|assistant|supervisor/i;

/** Tenta separar "Cargo | Empresa | Cidade" ou "Cargo - Empresa" ou "Empresa\nCargo". */
function splitHeader(parts: string[]): { role: string; company: string; location: string } {
  const joined = parts.join(" | ");
  const pieces = joined.split(/\s*(?:\||•|·| - | – | — | at | @ | na | no | em )\s*/i).map((p) => p.trim()).filter(Boolean);
  if (pieces.length === 0) return { role: "", company: "", location: "" };
  if (pieces.length === 1) return { role: pieces[0], company: "", location: "" };
  const location = pieces.length >= 3 && /,|remote|remoto|home ?office/i.test(pieces[pieces.length - 1]) ? pieces.pop()! : "";
  let role = pieces[0];
  let company = pieces.slice(1).join(" ");
  if (!ROLE_WORDS.test(role) && ROLE_WORDS.test(company)) [role, company] = [company, role];
  return { role, company, location };
}

function parseEducation(lines: string[]): Education[] {
  const out: Education[] = [];
  let current: Education | null = null;
  const isDegree = (t: string) =>
    /bachar|licenc|tecn[oó]log|gradua|mestr|doutor|mba|p[oó]s|bsc|msc|phd|bachelor|master|degree|engineer|ci[eê]ncia|an[aá]lise|curso/i.test(t);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const range = line.match(DATE_RANGE);
    const years = line.match(/(?:19|20)\d{2}/g);
    const rest = line.replace(DATE_RANGE, "").replace(/(?:19|20)\d{2}/g, "").replace(/[|•·,\-–—()\s]+$/g, "").replace(/^[|•·,\-–—()\s]+/g, "").trim();
    // Datas sozinhas: pertencem à entrada em aberto ou à última sem datas.
    const target = current ?? (out.length && !out[out.length - 1].end ? out[out.length - 1] : null);
    if (!rest && target) {
      if (range) {
        target.start = range[1];
        target.end = range[2];
      } else if (years) target.end = years[years.length - 1];
      continue;
    }
    if (!current) current = { institution: "", degree: "", start: "", end: "" };
    if (range) {
      current.start = range[1];
      current.end = range[2];
    } else if (years && !current.end) current.end = years[years.length - 1];
    if (rest) {
      if (!current.degree && isDegree(rest)) current.degree = rest;
      else if (!current.institution) current.institution = rest;
      else if (!current.degree) current.degree = rest;
    }
    if (current.institution && current.degree) {
      out.push(current);
      current = null;
    }
  }
  if (current && (current.institution || current.degree)) out.push(current);
  return out;
}

function parseCertifications(lines: string[]): Certification[] {
  return lines
    .map((l) => l.replace(BULLET, "").trim())
    .filter(Boolean)
    .map((l) => {
      const year = l.match(/(?:19|20)\d{2}/)?.[0] ?? "";
      const parts = l.replace(year, "").split(/\s*(?:\||•|·| - | – | — |,)\s*/).map((p) => p.trim()).filter(Boolean);
      return { name: parts[0] ?? l, issuer: parts.slice(1).join(", "), year };
    });
}

function parseSkills(lines: string[]): string[] {
  return lines
    .flatMap((l) => l.replace(BULLET, "").split(/[,;|•·]/))
    .map((s) => s.replace(/^[^\w]+|[^\w+#.]+$/g, "").trim())
    .filter((s) => s.length > 0 && s.length <= 40)
    .filter((s, i, a) => a.indexOf(s) === i);
}

function parseLanguages(lines: string[]): { name: string; level: string }[] {
  return lines
    .flatMap((l) => l.replace(BULLET, "").split(/[,;|•·]/))
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^([^(:\-–—]+)[\s(:\-–—]+(.+?)\)?$/);
      return m ? { name: m[1].trim(), level: m[2].trim() } : { name: s, level: "" };
    });
}

/** Heurística pura, sem LLM. Retorna um rascunho parcial para a pessoa revisar. */
export function parseResumeText(text: string): Partial<Resume> {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+/g, " ").trim());
  const nonEmpty = lines.filter(Boolean);
  const all = nonEmpty.join("\n");

  const contact = {
    name: "",
    title: "",
    email: all.match(EMAIL)?.[0] ?? "",
    phone: findPhone(all),
    location: "",
    linkedin: all.match(LINKEDIN)?.[0] ?? "",
    github: all.match(GITHUB)?.[0] ?? "",
    website: "",
  };

  // Nome: primeira linha curta sem e-mail/telefone/URL e que não seja título de seção.
  const head = nonEmpty.slice(0, 6);
  for (const l of head) {
    if (!EMAIL.test(l) && !PHONE.test(l) && !/https?:|www\.|linkedin|github/i.test(l) && !detectSection(l) && l.length <= 60 && l.split(" ").length <= 6) {
      contact.name = l;
      break;
    }
  }
  const nameIdx = nonEmpty.indexOf(contact.name);
  if (nameIdx >= 0) {
    const next = nonEmpty[nameIdx + 1];
    if (next && !EMAIL.test(next) && !PHONE.test(next) && !/https?:|www\./i.test(next) && !detectSection(next) && next.length <= 80) contact.title = next;
  }

  const sections = splitSections(nonEmpty);
  const pick = (key: SectionKey) => sections.filter((s) => s.key === key).flatMap((s) => s.lines);

  const draft: Partial<Resume> = { contact };
  const summary = pick("summary").join(" ").trim();
  if (summary) draft.summary = summary;
  const experiences = parseExperiences(pick("experience"));
  if (experiences.length) draft.experiences = experiences;
  const education = parseEducation(pick("education"));
  if (education.length) draft.education = education;
  const certifications = parseCertifications(pick("certifications"));
  if (certifications.length) draft.certifications = certifications;
  const skills = parseSkills(pick("skills"));
  if (skills.length) draft.skills = skills;
  const languages = parseLanguages(pick("languages"));
  if (languages.length) draft.languages = languages;
  return draft;
}
