export type ResumeLanguage = "pt-BR" | "en";
export type TemplateId = "two-column" | "single-column";

export interface Contact {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
}

export interface Experience {
  company: string;
  role: string;
  start: string;
  end: string;
  location: string;
  bullets: string[];
  /** Texto bruto digitado pela pessoa, antes de a LLM melhorar. */
  raw?: string;
}

export interface Education {
  institution: string;
  degree: string;
  start: string;
  end: string;
}

export interface Certification {
  name: string;
  issuer: string;
  year: string;
}

export interface Language {
  name: string;
  level: string;
}

export interface Resume {
  contact: Contact;
  summary: string;
  experiences: Experience[];
  education: Education[];
  certifications: Certification[];
  skills: string[];
  languages: Language[];
}

export function emptyContact(): Contact {
  return { name: "", title: "", email: "", phone: "", location: "", linkedin: "", github: "", website: "" };
}

export function emptyExperience(): Experience {
  return { company: "", role: "", start: "", end: "", location: "", bullets: [], raw: "" };
}

export function emptyResume(): Resume {
  return {
    contact: emptyContact(),
    summary: "",
    experiences: [],
    education: [],
    certifications: [],
    skills: [],
    languages: [],
  };
}

/** Garante que um objeto vindo de JSON (LLM, import, DB) tenha o shape de Resume. */
export function normalizeResume(input: unknown): Resume {
  const base = emptyResume();
  if (!input || typeof input !== "object") return base;
  const o = input as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  const contact = (o.contact && typeof o.contact === "object" ? o.contact : {}) as Record<string, unknown>;
  return {
    contact: {
      name: str(contact.name),
      title: str(contact.title),
      email: str(contact.email),
      phone: str(contact.phone),
      location: str(contact.location),
      linkedin: str(contact.linkedin),
      github: str(contact.github),
      website: str(contact.website),
    },
    summary: str(o.summary),
    experiences: arr(o.experiences).map((e) => {
      const x = (e ?? {}) as Record<string, unknown>;
      return {
        company: str(x.company),
        role: str(x.role),
        start: str(x.start),
        end: str(x.end),
        location: str(x.location),
        bullets: arr(x.bullets).map(str).filter(Boolean),
        raw: str(x.raw),
      };
    }),
    education: arr(o.education).map((e) => {
      const x = (e ?? {}) as Record<string, unknown>;
      return { institution: str(x.institution), degree: str(x.degree), start: str(x.start), end: str(x.end) };
    }),
    certifications: arr(o.certifications).map((e) => {
      const x = (e ?? {}) as Record<string, unknown>;
      return { name: str(x.name), issuer: str(x.issuer), year: str(x.year) };
    }),
    skills: arr(o.skills).map(str).filter(Boolean),
    languages: arr(o.languages).map((e) => {
      const x = (e ?? {}) as Record<string, unknown>;
      return { name: str(x.name), level: str(x.level) };
    }),
  };
}
