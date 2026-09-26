import { createElement } from "react";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import type { Resume, ResumeLanguage, TemplateId } from "@/src/types/resume";
import { TEMPLATES } from "./registry";

// Sem hifenização: palavras quebradas com hífen atrapalham ATS e busca no PDF.
Font.registerHyphenationCallback((word) => [word]);

export interface RenderOptions {
  template: TemplateId;
  language: ResumeLanguage;
}

/** Gera o PDF (texto real, Helvetica padrão) em Node, sem navegador. */
export async function renderResumePdf(resume: Resume, opts: RenderOptions): Promise<Buffer> {
  const def = TEMPLATES[opts.template] ?? TEMPLATES["two-column"];
  const element = createElement(def.component, { resume, language: opts.language });
  return renderToBuffer(element as never);
}
