import { normalizeResume, type Experience, type Resume, type ResumeLanguage } from "@/src/types/resume";
import { chatJson } from "./client";
import { polishSystem, polishUser } from "./prompts/polish";
import { tailorSystem, tailorUser } from "./prompts/tailor";
import { LlmError, type JobInput, type ProviderConfig } from "./types";

export async function polishExperience(p: ProviderConfig, exp: Experience, language: ResumeLanguage): Promise<{ bullets: string[] }> {
  const out = (await chatJson(p, { system: polishSystem(language), user: polishUser(exp), maxTokens: 1200 })) as { bullets?: unknown };
  const bullets = Array.isArray(out?.bullets) ? out.bullets.filter((b): b is string => typeof b === "string" && b.trim().length > 0).map((b) => b.trim()) : [];
  if (bullets.length === 0) throw new LlmError(502, "A LLM não retornou bullets");
  return { bullets };
}

export async function tailorResume(p: ProviderConfig, resume: Resume, job: JobInput, research: string, language: ResumeLanguage): Promise<Resume> {
  const out = await chatJson(p, { system: tailorSystem(language), user: tailorUser(resume, job, research), maxTokens: 6000 });
  const tailored = normalizeResume(out);
  // Campos que a LLM não pode alterar: garante a partir do original.
  tailored.contact = { ...resume.contact };
  tailored.education = resume.education.map((e) => ({ ...e }));
  tailored.certifications = resume.certifications.map((c) => ({ ...c }));
  tailored.languages = resume.languages.map((l) => ({ ...l }));
  if (tailored.experiences.length !== resume.experiences.length) {
    // Se a LLM perdeu/duplicou experiências, volta pro original mantendo o resumo/skills.
    tailored.experiences = resume.experiences.map((e) => ({ ...e, bullets: [...e.bullets] }));
  } else {
    tailored.experiences = tailored.experiences.map((e, i) => ({
      ...resume.experiences[i],
      bullets: e.bullets.length ? e.bullets : [...resume.experiences[i].bullets],
    }));
  }
  if (tailored.skills.length === 0) tailored.skills = [...resume.skills];
  if (!tailored.summary) tailored.summary = resume.summary;
  return tailored;
}
