"use client";
import { useState } from "react";
import { emptyExperience, type Experience, type ResumeLanguage } from "@/src/types/resume";
import { api } from "@/src/ui/api";
import { Button, ErrorBox, Field, Input, Row, Textarea } from "../ui";

export function ExperiencesForm({ value, language, onChange }: { value: Experience[]; language: ResumeLanguage; onChange: (v: Experience[]) => void }) {
  const update = (i: number, patch: Partial<Experience>) => onChange(value.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-4">
      {value.map((exp, i) => (
        <ExperienceItem
          key={i}
          exp={exp}
          index={i}
          total={value.length}
          language={language}
          onChange={(p) => update(i, p)}
          onRemove={() => onChange(value.filter((_, j) => j !== i))}
          onMove={(d) => move(i, d)}
        />
      ))}
      <Button onClick={() => onChange([...value, emptyExperience()])}>+ Adicionar experiência</Button>
    </div>
  );
}

function ExperienceItem({ exp, index, total, language, onChange, onRemove, onMove }: { exp: Experience; index: number; total: number; language: ResumeLanguage; onChange: (p: Partial<Experience>) => void; onRemove: () => void; onMove: (d: -1 | 1) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{ bullets: string[]; provider: string } | null>(null);

  const polish = async () => {
    setBusy(true);
    setError(null);
    try {
      setProposal(await api.polish(exp, language));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="mb-2 flex items-center gap-1">
        <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Experiência {index + 1}</span>
        <Button size="sm" variant="ghost" onClick={() => onMove(-1)} disabled={index === 0} title="Mover para cima">↑</Button>
        <Button size="sm" variant="ghost" onClick={() => onMove(1)} disabled={index === total - 1} title="Mover para baixo">↓</Button>
        <Button size="sm" variant="danger" onClick={onRemove}>Remover</Button>
      </div>
      <Row>
        <Field label="Cargo"><Input value={exp.role} onChange={(e) => onChange({ role: e.target.value })} /></Field>
        <Field label="Empresa"><Input value={exp.company} onChange={(e) => onChange({ company: e.target.value })} /></Field>
        <Field label="Início"><Input value={exp.start} placeholder="jan 2021" onChange={(e) => onChange({ start: e.target.value })} /></Field>
        <Field label="Fim"><Input value={exp.end} placeholder="vazio = atual" onChange={(e) => onChange({ end: e.target.value })} /></Field>
        <Field label="Local" className="sm:col-span-2"><Input value={exp.location} onChange={(e) => onChange({ location: e.target.value })} /></Field>
      </Row>
      <Field label="O que você fez (escreva do seu jeito, a IA melhora depois)" className="mt-2">
        <Textarea value={exp.raw ?? ""} placeholder="Ex: cuidava das APIs de pagamento em node, migrei o banco pra postgres, reduzi a latência em 40%..." onChange={(e) => onChange({ raw: e.target.value })} />
      </Field>
      <Field label="Bullets do currículo (um por linha)" className="mt-2" hint="É isso que vai pro PDF.">
        <BulletsTextarea bullets={exp.bullets} onChange={(bullets) => onChange({ bullets })} />
      </Field>
      <div className="mt-2 flex items-center gap-2">
        <Button variant="primary" size="sm" busy={busy} onClick={polish} disabled={!(exp.raw?.trim() || exp.bullets.length)}>
          ✨ Melhorar com IA
        </Button>
        <span className="text-xs text-zinc-500">Uma chamada de LLM por clique.</span>
      </div>
      {error ? <div className="mt-2"><ErrorBox message={error} onClose={() => setError(null)} /></div> : null}
      {proposal ? (
        <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-2">
          <div className="mb-1 text-xs font-semibold text-emerald-800">Sugestão ({proposal.provider})</div>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {proposal.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="primary" onClick={() => { onChange({ bullets: proposal.bullets }); setProposal(null); }}>Aceitar</Button>
            <Button size="sm" onClick={() => setProposal(null)}>Descartar</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Mantém o texto digitado (inclusive linhas vazias) e só normaliza ao salvar nos bullets. */
function BulletsTextarea({ bullets, onChange }: { bullets: string[]; onChange: (b: string[]) => void }) {
  const [text, setText] = useState(bullets.join("\n"));
  const [synced, setSynced] = useState(bullets);

  // Bullets mudaram por fora (ex.: aceitar sugestão da IA): ajusta o texto durante o render.
  if (synced !== bullets) {
    setSynced(bullets);
    if (JSON.stringify(parseBullets(text)) !== JSON.stringify(bullets)) setText(bullets.join("\n"));
  }

  return (
    <Textarea
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseBullets(e.target.value));
      }}
    />
  );
}

function parseBullets(t: string): string[] {
  return t.split("\n").map((b) => b.replace(/^\s*[-•*]\s*/, "").trim()).filter(Boolean);
}
