/**
 * Extrai o primeiro objeto/array JSON de um texto de LLM.
 * Tolera cercas ```json, texto antes/depois e espaços.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenced?.[1]?.trim(), trimmed].filter((c): c is string => Boolean(c));

  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      /* tenta recortar */
    }
    const start = Math.min(...["{", "["].map((ch) => c.indexOf(ch)).filter((i) => i >= 0));
    if (!Number.isFinite(start)) continue;
    const endObj = c.lastIndexOf("}");
    const endArr = c.lastIndexOf("]");
    const end = Math.max(endObj, endArr);
    if (end <= start) continue;
    try {
      return JSON.parse(c.slice(start, end + 1));
    } catch {
      /* próximo candidato */
    }
  }
  throw new Error("Resposta da LLM não contém JSON válido");
}
