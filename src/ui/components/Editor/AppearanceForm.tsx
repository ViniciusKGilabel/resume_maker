"use client";
import { defaultResumeStyle, type ResumeStyle } from "@/src/types/resume";
import { Button, Field, Input, Row } from "../ui";

const FIELDS: { key: keyof ResumeStyle; label: string; hint?: string }[] = [
  { key: "sidebarBg", label: "Fundo da coluna lateral", hint: "Template “Duas colunas”." },
  { key: "sidebarText", label: "Cor da letra da coluna lateral", hint: "Template “Duas colunas”." },
  { key: "mainBg", label: "Fundo da coluna principal" },
  { key: "mainText", label: "Cor da letra da coluna principal" },
];

export function AppearanceForm({ value, onChange }: { value: ResumeStyle; onChange: (s: ResumeStyle) => void }) {
  return (
    <div className="space-y-3">
      <Row>
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label} hint={f.hint}>
            <Input type="color" value={value[f.key]} onChange={(e) => onChange({ ...value, [f.key]: e.target.value })} className="h-9 p-1" />
          </Field>
        ))}
      </Row>
      <Button size="sm" variant="ghost" onClick={() => onChange(defaultResumeStyle())}>Restaurar cores padrão</Button>
    </div>
  );
}
