import { resumesRepo } from "@/src/db/resumes";
import { tailoredRepo } from "@/src/db/tailored";
import { isTemplateId } from "@/src/pdf/registry";
import { renderResumePdf } from "@/src/pdf/render";
import { handle, jsonError, readJson } from "@/src/server/errors";
import { normalizeResume, type Resume, type ResumeLanguage, type TemplateId } from "@/src/types/resume";

function pdfResponse(buf: Buffer, filename: string, download: boolean): Response {
  const safe = filename.replace(/[^\w.-]+/g, "_") || "curriculo";
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="${safe}.pdf"`,
      "cache-control": "no-store",
    },
  });
}

/** GET ?resumeId= | ?tailoredId=  [&template=&download=1] */
export const GET = handle(async (req: Request) => {
  const url = new URL(req.url);
  const tailoredId = url.searchParams.get("tailoredId");
  const resumeId = url.searchParams.get("resumeId");
  const tpl = url.searchParams.get("template");
  const download = url.searchParams.get("download") === "1";

  let data: Resume;
  let language: ResumeLanguage;
  let template: TemplateId;
  let name: string;
  if (tailoredId) {
    const t = tailoredRepo.get(tailoredId);
    if (!t) return jsonError(404, "Versão não encontrada");
    const base = resumesRepo.get(t.resumeId);
    data = t.data;
    language = base?.language ?? "pt-BR";
    template = base?.template ?? "two-column";
    name = `${data.contact.name || "curriculo"}-${t.company || t.jobTitle}`;
  } else if (resumeId) {
    const r = resumesRepo.get(resumeId);
    if (!r) return jsonError(404, "Currículo não encontrado");
    data = r.data;
    language = r.language;
    template = r.template;
    name = data.contact.name || r.name;
  } else {
    return jsonError(400, "resumeId ou tailoredId obrigatório");
  }
  if (isTemplateId(tpl)) template = tpl;
  const buf = await renderResumePdf(data, { template, language });
  return pdfResponse(buf, name, download);
});

/** POST { resume, template, language } para preview de rascunho não salvo. */
export const POST = handle(async (req: Request) => {
  const body = await readJson<{ resume: Resume; template?: TemplateId; language?: ResumeLanguage }>(req);
  const data = normalizeResume(body.resume);
  const buf = await renderResumePdf(data, {
    template: isTemplateId(body.template) ? body.template : "two-column",
    language: body.language === "en" ? "en" : "pt-BR",
  });
  return pdfResponse(buf, data.contact.name || "curriculo", false);
});
