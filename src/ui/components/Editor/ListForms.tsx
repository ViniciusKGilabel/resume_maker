"use client";
import { useState } from "react";
import type { Certification, Education, Language } from "@/src/types/resume";
import { Button, Field, Input, Row } from "../ui";

export function EducationForm({ value, onChange }: { value: Education[]; onChange: (v: Education[]) => void }) {
  const update = (i: number, p: Partial<Education>) => onChange(value.map((e, j) => (j === i ? { ...e, ...p } : e)));
  return (
    <div className="space-y-3">
      {value.map((ed, i) => (
        <div key={i} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <Row>
            <Field label="Curso / grau"><Input value={ed.degree} onChange={(e) => update(i, { degree: e.target.value })} /></Field>
            <Field label="Instituição"><Input value={ed.institution} onChange={(e) => update(i, { institution: e.target.value })} /></Field>
            <Field label="Início"><Input value={ed.start} onChange={(e) => update(i, { start: e.target.value })} /></Field>
            <Field label="Fim"><Input value={ed.end} onChange={(e) => update(i, { end: e.target.value })} /></Field>
          </Row>
          <div className="mt-2 text-right"><Button size="sm" variant="danger" onClick={() => onChange(value.filter((_, j) => j !== i))}>Remover</Button></div>
        </div>
      ))}
      <Button onClick={() => onChange([...value, { institution: "", degree: "", start: "", end: "" }])}>+ Adicionar formação</Button>
    </div>
  );
}

export function CertificationsForm({ value, onChange }: { value: Certification[]; onChange: (v: Certification[]) => void }) {
  const update = (i: number, p: Partial<Certification>) => onChange(value.map((e, j) => (j === i ? { ...e, ...p } : e)));
  return (
    <div className="space-y-2">
      {value.map((c, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_80px_auto] items-end gap-2">
          <Field label="Nome"><Input value={c.name} onChange={(e) => update(i, { name: e.target.value })} /></Field>
          <Field label="Emissor"><Input value={c.issuer} onChange={(e) => update(i, { issuer: e.target.value })} /></Field>
          <Field label="Ano"><Input value={c.year} onChange={(e) => update(i, { year: e.target.value })} /></Field>
          <Button size="sm" variant="danger" onClick={() => onChange(value.filter((_, j) => j !== i))}>×</Button>
        </div>
      ))}
      <Button onClick={() => onChange([...value, { name: "", issuer: "", year: "" }])}>+ Adicionar certificação</Button>
    </div>
  );
}

export function LanguagesForm({ value, onChange }: { value: Language[]; onChange: (v: Language[]) => void }) {
  const update = (i: number, p: Partial<Language>) => onChange(value.map((e, j) => (j === i ? { ...e, ...p } : e)));
  return (
    <div className="space-y-2">
      {value.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <Field label="Idioma"><Input value={l.name} onChange={(e) => update(i, { name: e.target.value })} /></Field>
          <Field label="Nível"><Input value={l.level} placeholder="fluente, avançado..." onChange={(e) => update(i, { level: e.target.value })} /></Field>
          <Button size="sm" variant="danger" onClick={() => onChange(value.filter((_, j) => j !== i))}>×</Button>
        </div>
      ))}
      <Button onClick={() => onChange([...value, { name: "", level: "" }])}>+ Adicionar idioma</Button>
    </div>
  );
}

export function SkillsForm({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const items = draft.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    if (!items.length) return;
    onChange([...value, ...items.filter((s) => !value.includes(s))]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2 py-0.5 text-xs">
            {s}
            <button type="button" className="text-zinc-500 hover:text-zinc-900" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remover ${s}`}>×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={draft} placeholder="Node.js, PostgreSQL, Docker (Enter adiciona)" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <Button onClick={add}>Adicionar</Button>
      </div>
    </div>
  );
}
