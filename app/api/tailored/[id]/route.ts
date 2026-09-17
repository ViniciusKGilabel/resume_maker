import { tailoredRepo } from "@/src/db/tailored";
import { handle, jsonError } from "@/src/server/errors";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const row = tailoredRepo.get(id);
  return row ? Response.json({ tailored: row }) : jsonError(404, "Versão não encontrada");
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  return tailoredRepo.remove(id) ? Response.json({ ok: true }) : jsonError(404, "Versão não encontrada");
});
