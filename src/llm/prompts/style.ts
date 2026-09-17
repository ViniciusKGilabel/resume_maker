import type { ResumeLanguage } from "@/src/types/resume";

export const BANNED_WORDS = [
  "leveraged", "leverage", "spearheaded", "impactful", "synergy", "synergies", "passionate",
  "dynamic", "seamless", "seamlessly", "robust", "cutting-edge", "state-of-the-art", "game-changer",
  "delve", "tapestry", "landscape", "elevate", "empower", "unlock", "harness", "holistic",
  "results-driven", "detail-oriented", "team player", "go-getter", "guru", "ninja", "rockstar",
  "alavanquei", "alavancar", "impactante", "sinergia", "apaixonado", "dinâmico", "robusto",
  "de ponta", "revolucionário", "potencializar", "empoderar", "destravar", "holístico",
  "proativo", "orientado a resultados", "atento aos detalhes",
];

export function languageName(l: ResumeLanguage): string {
  return l === "en" ? "English" : "Brazilian Portuguese (pt-BR)";
}

/** Regras de estilo compartilhadas por polish e tailor. */
export function styleRules(language: ResumeLanguage): string {
  return `Writing rules (mandatory):
- Write in ${languageName(language)}.
- Sound like a competent person wrote it, not an AI. Plain, direct, specific.
- Each bullet: action verb + what was done + technology or context + concrete result when the person gave one.
- Keep every number, metric, name and technology the person provided. Never invent metrics, percentages, team sizes, clients or technologies.
- If there is no measurable result, describe the scope or responsibility concretely instead of inventing one.
- Short sentences. No bullet longer than about 25 words.
- Never use these words or their variants: ${BANNED_WORDS.join(", ")}.
- No em dashes, no semicolons, no exclamation marks, no emojis, no adjectives stacked in threes.
- No first person ("I", "eu"). Start bullets with the verb.
- Do not repeat the same verb at the start of two bullets.
- Do not add a closing summary or commentary. Output only the JSON requested.`;
}
