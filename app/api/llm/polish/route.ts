import { polishExperience } from "@/src/llm/service";
import { handle, jsonError, readJson } from "@/src/server/errors";
import { loadSettings, resolveProvider } from "@/src/server/settings";
import type { Experience, ResumeLanguage } from "@/src/types/resume";

export const POST = handle(async (req: Request) => {
  const body = await readJson<{ experience: Experience; language?: ResumeLanguage; providerId?: string }>(req);
  if (!body.experience) return jsonError(400, "experience obrigatório");
  const source = body.experience.raw?.trim() || body.experience.bullets?.join("\n").trim();
  if (!source) return jsonError(400, "Escreva algo sobre a experiência antes de melhorar");
  const settings = loadSettings();
  const provider = resolveProvider(settings, body.providerId ?? settings.activeProviderId);
  const result = await polishExperience(provider, body.experience, body.language === "en" ? "en" : "pt-BR");
  return Response.json({ bullets: result.bullets, provider: provider.name });
});
