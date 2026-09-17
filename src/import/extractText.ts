/**
 * Extração de texto de PDF com pdf-parse (pdf.js). Sem LLM.
 *
 * O pdf.js cria um DOMMatrix no carregamento do módulo e tenta obtê-lo do pacote nativo
 * @napi-rs/canvas (23 MB). Extrair texto não desenha nada, então um stub mínimo basta
 * e mantém o container leve.
 */
function ensureDomMatrix(): void {
  const g = globalThis as { DOMMatrix?: unknown };
  if (g.DOMMatrix) return;
  class DOMMatrixStub {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(init?: number[]) {
      if (Array.isArray(init) && init.length >= 6) [this.a, this.b, this.c, this.d, this.e, this.f] = init;
    }
    multiplySelf() { return this; }
    preMultiplySelf() { return this; }
    translate() { return this; }
    scale() { return this; }
    invertSelf() { return this; }
  }
  g.DOMMatrix = DOMMatrixStub;
}

export async function extractPdfText(buffer: Buffer | Uint8Array): Promise<string> {
  ensureDomMatrix();
  const { PDFParse } = await import("pdf-parse");
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
