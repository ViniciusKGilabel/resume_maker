import { resumesRepo } from "@/src/db/resumes";
import { tailoredRepo } from "@/src/db/tailored";
import { handle, jsonError, readJson } from "@/src/server/errors";
import type { Resume } from "@/src/types/resume";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  return Response.json({ tailored: tailoredRepo.listByResume(id) });
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!resumesRepo.get(id)) return jsonError(404, "Currículo não encontrado");
  const body = await readJson<{ company?: string; jobTitle?: string; jobDescription?: string; links?: string[]; provider?: string; data: Resume }>(req);
  if (!body.data) return jsonError(400, "data obrigatório");
  const row = tailoredRepo.create({
    resumeId: id,
    company: body.company ?? "",
    jobTitle: body.jobTitle ?? "",
    jobDescription: body.jobDescription ?? "",
    links: body.links ?? [],
    provider: body.provider ?? "",
    data: body.data,
  });
  return Response.json({ tailored: row }, { status: 201 });
});
