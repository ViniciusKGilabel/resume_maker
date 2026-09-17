import type { Experience, ResumeLanguage } from "@/src/types/resume";
import { styleRules } from "./style";

export function polishSystem(language: ResumeLanguage): string {
  return `You rewrite one job experience for a resume.
${styleRules(language)}
Output format: a JSON object {"bullets": ["...", "..."]} with 3 to 6 bullets. Nothing else.`;
}

export function polishUser(exp: Experience): string {
  const source = exp.raw?.trim() || exp.bullets.join("\n");
  return `Role: ${exp.role || "(not given)"}
Company: ${exp.company || "(not given)"}
Period: ${exp.start || "?"} to ${exp.end || "?"}

What the person wrote about this job (rewrite this; do not add facts that are not here):
"""
${source}
"""`;
}
