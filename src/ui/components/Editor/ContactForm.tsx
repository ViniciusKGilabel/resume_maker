"use client";
import type { Contact } from "@/src/types/resume";
import { Field, Input, Row } from "../ui";

const FIELDS: { key: keyof Contact; label: string; placeholder?: string }[] = [
  { key: "name", label: "Nome completo" },
  { key: "title", label: "Título profissional", placeholder: "Desenvolvedor Backend" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "location", label: "Cidade / UF" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/..." },
  { key: "github", label: "GitHub", placeholder: "github.com/..." },
  { key: "website", label: "Site" },
];

export function ContactForm({ value, onChange }: { value: Contact; onChange: (c: Contact) => void }) {
  return (
    <Row>
      {FIELDS.map((f) => (
        <Field key={f.key} label={f.label}>
          <Input value={value[f.key]} placeholder={f.placeholder} onChange={(e) => onChange({ ...value, [f.key]: e.target.value })} />
        </Field>
      ))}
    </Row>
  );
}
