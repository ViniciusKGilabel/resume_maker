import type { ResumeLanguage } from "@/src/types/resume";

export interface Labels {
  summary: string;
  experience: string;
  education: string;
  certifications: string;
  skills: string;
  languages: string;
  contact: string;
  present: string;
}

const PT: Labels = {
  summary: "Resumo",
  experience: "Experiência Profissional",
  education: "Formação",
  certifications: "Certificações",
  skills: "Habilidades",
  languages: "Idiomas",
  contact: "Contato",
  present: "Atual",
};

const EN: Labels = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  certifications: "Certifications",
  skills: "Skills",
  languages: "Languages",
  contact: "Contact",
  present: "Present",
};

export function labels(language: ResumeLanguage): Labels {
  return language === "en" ? EN : PT;
}

export function period(start: string, end: string, l: Labels): string {
  if (!start.trim() && !end.trim()) return "";
  const e = end.trim() || l.present;
  return [start.trim(), e].filter(Boolean).join(" – ");
}
