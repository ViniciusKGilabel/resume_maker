import { PDFParse } from "pdf-parse";

/** Extrai o texto de um PDF com pdf-parse (pdf.js). Sem LLM. */
export async function extractPdfText(buffer: Buffer | Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}
