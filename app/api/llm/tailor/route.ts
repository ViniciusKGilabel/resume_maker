import { resumesRepo } from "@/src/db/resumes";
import { tailorResume } from "@/src/llm/service";
import type { JobInput } from "@/src/llm/types";
import { buildResearchContext } from "@/src/research";
import { handle, jsonError, readJson } from "@/src/server/errors";
import { loadSettings, resolveProvider } from "@/src/server/settings";
import { normalizeResume, type Resume, type ResumeLanguage } from "@/src/types/resume";

interface Body {
  resumeId?: string;
  resume?: Resume;
  language?: ResumeLanguage;
  job: Partial<JobInput>;
  compare?: boolean;
}

export const POST = handle(async (req: Request) => {
  const body = await readJson<Body>(req);
  const job: JobInput = {
    company: (body.job?.company ?? "").trim(),
    title: (body.job?.title ?? "").trim(),
    description: (body.job?.description ?? "").trim(),
    links: Array.isArray(body.job?.links) ? body.job.links.map(String) : [],
    webSearch: Boolean(body.job?.webSearch),
  };
  if (!job.description && !job.title) return jsonError(400, "Informe pelo menos o cargo ou a descrição da vaga");

  let resume: Resume;
  let language: ResumeLanguage = body.language === "en" ? "en" : "pt-BR";
  if (body.resumeId) {
    const row = resumesRepo.get(body.resumeId);
    if (!row) return jsonError(404, "Currículo não encontrado");
    resume = row.data;
    language = body.language ?? row.language;
  } else if (body.resume) {
    resume = normalizeResume(body.resume);
  } else {
    return jsonError(400, "resumeId ou resume obrigatório");
  }

  const settings = loadSettings();
  const primary = resolveProvider(settings, settings.activeProviderId);
  const providers = [primary];
  if (body.compare) {
    if (!settings.compareProviderId || settings.compareProviderId === primary.id) return jsonError(400, "Configure um provider de comparação diferente do principal");
    providers.push(resolveProvider(settings, settings.compareProviderId));
  }

  const research = await buildResearchContext(job, settings.search);

  const settled = await Promise.allSettled(providers.map((p) => tailorResume(p, resume, job, research.context, language)));
  const results = settled.map((r, i) => ({
    providerId: providers[i].id,
    providerName: providers[i].name,
    resume: r.status === "fulfilled" ? r.value : undefined,
    error: r.status === "rejected" ? (r.reason instanceof Error ? r.reason.message : String(r.reason)) : undefined,
  }));
  if (results.every((r) => r.error)) return jsonError(502, `LLM: ${results.map((r) => `${r.providerName}: ${r.error}`).join(" | ")}`);
  return Response.json({ results, research: research.context, sources: research.sources });
});
