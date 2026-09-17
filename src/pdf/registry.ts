import type { ReactElement } from "react";
import type { Resume, ResumeLanguage, TemplateId } from "@/src/types/resume";
import { SingleColumn } from "./templates/SingleColumn";
import { TwoColumn } from "./templates/TwoColumn";

export interface TemplateDef {
  id: TemplateId;
  name: string;
  description: string;
  component: (props: { resume: Resume; language: ResumeLanguage }) => ReactElement;
}

export const TEMPLATES: Record<TemplateId, TemplateDef> = {
  "two-column": {
    id: "two-column",
    name: "Duas colunas",
    description: "Lateral com contato e skills, principal com resumo e experiência.",
    component: TwoColumn,
  },
  "single-column": {
    id: "single-column",
    name: "Uma coluna",
    description: "O mais simples possível, tudo em sequência.",
    component: SingleColumn,
  },
};

export function isTemplateId(v: unknown): v is TemplateId {
  return typeof v === "string" && v in TEMPLATES;
}
