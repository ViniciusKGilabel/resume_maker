import path from "node:path";
import { createElement } from "react";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import type { Resume, ResumeLanguage, TemplateId } from "@/src/types/resume";
import { TEMPLATES } from "./registry";

// Sem hifenização: o textkit do react-pdf insere um "-" visível em toda quebra de
// palavra feita via hyphenationCallback (mesmo sem hífen no texto original), o que
// atrapalha ATS e busca no PDF. Por isso aqui a palavra nunca é dividida; strings
// longas sem espaço (URLs) são pré-quebradas com \n antes de chegar no PDF — ver
// wrapLongToken em src/pdf/templates/shared.tsx.
Font.registerHyphenationCallback((word) => [word]);

// Helvetica padrão do react-pdf não é embutida (fonte base do PDF) e fica feia/genérica.
// Lato (OFL) embutida dá texto real com tipografia decente em qualquer leitor.
const fontsDir = path.join(process.cwd(), "public", "fonts");
Font.register({ family: "Lato", src: path.join(fontsDir, "Lato-Regular.ttf") });
Font.register({ family: "Lato-Bold", src: path.join(fontsDir, "Lato-Bold.ttf") });

export interface RenderOptions {
  template: TemplateId;
  language: ResumeLanguage;
}

/** Gera o PDF (texto real, fonte Lato embutida) em Node, sem navegador. */
export async function renderResumePdf(resume: Resume, opts: RenderOptions): Promise<Buffer> {
  const def = TEMPLATES[opts.template] ?? TEMPLATES["two-column"];
  const element = createElement(def.component, { resume, language: opts.language });
  return renderToBuffer(element as never);
}
