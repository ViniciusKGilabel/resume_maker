import type { ResumeRow, ResumeSummary } from "@/src/db/resumes";
import type { TailoredRow } from "@/src/db/tailored";
import type { DescribedModel } from "@/src/llm/modelInfo";
import type { Preset } from "@/src/llm/presets";
import type { JobInput, ProviderConfig } from "@/src/llm/types";
import type { AppSettings } from "@/src/server/settings";
import type { Experience, Resume, ResumeLanguage, TemplateId } from "@/src/types/resume";

export type { ResumeRow, ResumeSummary, TailoredRow, AppSettings, Preset, ProviderConfig, JobInput, DescribedModel };

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

export const api = {
  listResumes: () => call<{ resumes: ResumeSummary[] }>("/api/resumes").then((r) => r.resumes),
  getResume: (id: string) => call<{ resume: ResumeRow }>(`/api/resumes/${id}`).then((r) => r.resume),
  createResume: (input: { name: string; language?: ResumeLanguage; template?: TemplateId; data?: Resume }) =>
    call<{ resume: ResumeRow }>("/api/resumes", { method: "POST", body: JSON.stringify(input) }).then((r) => r.resume),
  updateResume: (id: string, patch: Partial<{ name: string; language: ResumeLanguage; template: TemplateId; data: Resume }>) =>
    call<{ resume: ResumeRow }>(`/api/resumes/${id}`, { method: "PUT", body: JSON.stringify(patch) }).then((r) => r.resume),
  deleteResume: (id: string) => call<{ ok: true }>(`/api/resumes/${id}`, { method: "DELETE" }),

  listTailored: (resumeId: string) => call<{ tailored: TailoredRow[] }>(`/api/resumes/${resumeId}/tailored`).then((r) => r.tailored),
  saveTailored: (resumeId: string, input: { company: string; jobTitle: string; jobDescription: string; links: string[]; provider: string; data: Resume }) =>
    call<{ tailored: TailoredRow }>(`/api/resumes/${resumeId}/tailored`, { method: "POST", body: JSON.stringify(input) }).then((r) => r.tailored),
  deleteTailored: (id: string) => call<{ ok: true }>(`/api/tailored/${id}`, { method: "DELETE" }),

  getSettings: () => call<{ settings: AppSettings; presets: Preset[] }>("/api/settings"),
  saveSettings: (s: AppSettings) => call<{ settings: AppSettings }>("/api/settings", { method: "PUT", body: JSON.stringify(s) }).then((r) => r.settings),
  listModels: (provider: ProviderConfig) => call<{ models: DescribedModel[] }>("/api/settings/models", { method: "POST", body: JSON.stringify({ provider }) }).then((r) => r.models),

  polish: (experience: Experience, language: ResumeLanguage) =>
    call<{ bullets: string[]; provider: string }>("/api/llm/polish", { method: "POST", body: JSON.stringify({ experience, language }) }),
  tailor: (input: { resumeId: string; job: JobInput; compare: boolean }) =>
    call<{ results: { providerId: string; providerName: string; resume?: Resume; error?: string }[]; research: string; sources: { url: string; ok: boolean }[] }>(
      "/api/llm/tailor",
      { method: "POST", body: JSON.stringify(input) },
    ),

  importPdf: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/import/pdf", { method: "POST", body: fd });
    const body = (await res.json()) as { draft?: Partial<Resume>; rawText?: string; error?: string };
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    return body as { draft: Partial<Resume>; rawText: string };
  },

  previewPdf: async (resume: Resume, template: TemplateId, language: ResumeLanguage, signal?: AbortSignal) => {
    const res = await fetch("/api/export/pdf", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ resume, template, language }), signal });
    if (!res.ok) throw new Error(`Preview falhou (${res.status})`);
    return res.blob();
  },

  downloadUrl: (target: { resumeId: string } | { tailoredId: string }, template?: TemplateId) => {
    const q = new URLSearchParams({ ...target, download: "1" });
    if (template) q.set("template", template);
    return `/api/export/pdf?${q}`;
  },
};
