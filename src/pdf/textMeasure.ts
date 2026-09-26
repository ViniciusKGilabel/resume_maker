import path from "node:path";
import * as fontkit from "fontkit";

const fontsDir = path.join(process.cwd(), "public", "fonts");

const FONT_FILES: Record<string, string> = {
  Lato: "Lato-Regular.ttf",
  "Lato-Bold": "Lato-Bold.ttf",
};

const cache = new Map<string, fontkit.Font>();

function loadFont(family: string): fontkit.Font {
  const cached = cache.get(family);
  if (cached) return cached;
  const file = FONT_FILES[family] ?? FONT_FILES.Lato;
  const font = fontkit.openSync(path.join(fontsDir, file)) as fontkit.Font;
  cache.set(family, font);
  return font;
}

/** Largura real (mesma unidade do PDF) do texto, usando as métricas da fonte embutida. */
export function measureTextWidth(text: string, fontSize: number, fontFamily = "Lato"): number {
  if (!text) return 0;
  const font = loadFont(fontFamily);
  return (font.layout(text).advanceWidth / font.unitsPerEm) * fontSize;
}
