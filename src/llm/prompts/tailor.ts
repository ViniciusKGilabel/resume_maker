import type { Resume, ResumeLanguage } from "@/src/types/resume";
import type { JobInput } from "../types";
import { styleRules } from "./style";

export function tailorSystem(language: ResumeLanguage): string {
  return `You adapt a resume to a specific job opening so it passes ATS keyword screening and reads well to a recruiter at that company.
${styleRules(language)}
Adaptation rules:
- Use the job description and company context to decide what to emphasize.
- Reuse the exact keywords and technology names from the job description when the person actually has that experience.
- Never add experience, employers, degrees, certifications or skills the person does not have. You may reorder and rephrase only.
- Rewrite "summary" in 2 to 4 sentences aimed at this role and company. No name of the company in the summary unless natural.
- Reorder "skills" so the ones relevant to the job come first; keep all original skills; do not add new ones.
- Reorder bullets inside each experience so the most relevant come first; rewrite them following the writing rules.
- Keep "contact", "education", "certifications" and "languages" unchanged.
- Keep experiences in the same chronological order.
Output format: the full resume as a JSON object with exactly these keys: contact, summary, experiences, education, certifications, skills, languages. Same structure as the input. Nothing else.`;
}

export function tailorUser(resume: Resume, job: JobInput, research: string): string {
  const parts = [
    `Target company: ${job.company || "(not given)"}`,
    `Target role: ${job.title || "(not given)"}`,
    `Job description:\n"""\n${job.description.trim() || "(not given)"}\n"""`,
  ];
  if (research.trim()) parts.push(`Context about the company (from the web, may be partial):\n"""\n${research.trim()}\n"""`);
  parts.push(`Current resume (JSON):\n${JSON.stringify(resume)}`);
  return parts.join("\n\n");
}
