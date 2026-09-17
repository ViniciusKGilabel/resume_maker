import { resumesRepo } from "@/src/db/resumes";
import { handle, readJson } from "@/src/server/errors";
import { emptyResume, type Resume, type ResumeLanguage, type TemplateId } from "@/src/types/resume";

export const GET = handle(async () => Response.json({ resumes: resumesRepo.list() }));

export const POST = handle(async (req: Request) => {
  const body = await readJson<{ name?: string; language?: ResumeLanguage; template?: TemplateId; data?: Resume }>(req);
  const row = resumesRepo.create({
    name: (body.name ?? "").trim() || "Meu currículo",
    language: body.language === "en" ? "en" : "pt-BR",
    template: body.template === "single-column" ? "single-column" : "two-column",
    data: body.data ?? emptyResume(),
  });
  return Response.json({ resume: row }, { status: 201 });
});
