import { PDFParse } from "pdf-parse";

/** Extrai o texto de um PDF com pdf-parse (pdf.js). Sem LLM. */
export async function extractPdfText(buffer: Buffer | Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return stripPageMarkers(result.text ?? "");
  } finally {
    await parser.destroy();
  }
}

/** Remove marcadores "-- 1 of 3 --" que o pdf-parse insere entre páginas. */
export function stripPageMarkers(text: string): string {
  return text.replace(/^\s*-- \d+ of \d+ --\s*$/gm, "");
}
