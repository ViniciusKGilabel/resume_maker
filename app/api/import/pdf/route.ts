import { extractPdfText } from "@/src/import/extractText";
import { parseResumeText } from "@/src/import/heuristics";
import { handle, jsonError } from "@/src/server/errors";

const MAX_BYTES = 10 * 1024 * 1024;

export const POST = handle(async (req: Request) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError(400, "Envie o PDF no campo 'file'");
  if (file.size > MAX_BYTES) return jsonError(413, "PDF maior que 10 MB");
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.subarray(0, 5).toString() !== "%PDF-") return jsonError(400, "O arquivo não é um PDF");
  const rawText = await extractPdfText(buf);
  if (!rawText.trim()) return jsonError(422, "Não foi possível extrair texto (PDF escaneado?). Preencha os campos manualmente.");
  return Response.json({ draft: parseResumeText(rawText), rawText });
});
