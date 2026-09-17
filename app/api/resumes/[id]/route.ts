import { resumesRepo } from "@/src/db/resumes";
import { handle, jsonError, readJson } from "@/src/server/errors";
import type { Resume, ResumeLanguage, TemplateId } from "@/src/types/resume";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const row = resumesRepo.get(id);
  return row ? Response.json({ resume: row }) : jsonError(404, "Currículo não encontrado");
});

export const PUT = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = await readJson<{ name?: string; language?: ResumeLanguage; template?: TemplateId; data?: Resume }>(req);
  const row = resumesRepo.update(id, body);
  return row ? Response.json({ resume: row }) : jsonError(404, "Currículo não encontrado");
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  return resumesRepo.remove(id) ? Response.json({ ok: true }) : jsonError(404, "Currículo não encontrado");
});
