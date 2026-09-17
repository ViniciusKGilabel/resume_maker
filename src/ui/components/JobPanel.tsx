"use client";
import { useState } from "react";
import type { JobInput } from "@/src/llm/types";
import type { Resume } from "@/src/types/resume";
import { api, type TailoredRow } from "@/src/ui/api";
import { Button, ErrorBox, Field, Input, Textarea, cx } from "./ui";

type Result = { providerId: string; providerName: string; resume?: Resume; error?: string };

interface Props {
  resumeId: string;
  canCompare: boolean;
  tailored: TailoredRow[];
  selectedTailoredId: string | null;
  onPreview: (id: string | null) => void;
  onSaved: (row: TailoredRow) => void;
  onDeleted: (id: string) => void;
}

export function JobPanel({ resumeId, canCompare, tailored, selectedTailoredId, onPreview, onSaved, onDeleted }: Props) {
  const [job, setJob] = useState<JobInput & { linksText: string }>({ company: "", title: "", description: "", links: [], webSearch: false, linksText: "" });
  const [busy, setBusy] = useState<"one" | "two" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [sources, setSources] = useState<{ url: string; ok: boolean }[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  const run = async (compare: boolean) => {
    setBusy(compare ? "two" : "one");
    setError(null);
    setResults([]);
    try {
      const links = job.linksText.split(/\s+/).map((l) => l.trim()).filter(Boolean);
      const r = await api.tailor({ resumeId, job: { ...job, links }, compare });
      setResults(r.results);
      setSources(r.sources);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const save = async (r: Result) => {
    if (!r.resume) return;
    setSaving(r.providerId);
    try {
      const row = await api.saveTailored(resumeId, {
        company: job.company,
        jobTitle: job.title,
        jobDescription: job.description,
        links: job.linksText.split(/\s+/).filter(Boolean),
        provider: r.providerName,
        data: r.resume,
      });
      onSaved(row);
      setResults([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const researching = job.webSearch || job.linksText.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-3">
        <h2 className="mb-2 text-sm font-semibold">Personalizar para uma vaga</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Empresa"><Input value={job.company} placeholder="Google" onChange={(e) => setJob({ ...job, company: e.target.value })} /></Field>
          <Field label="Cargo"><Input value={job.title} placeholder="Backend Engineer (Node.js)" onChange={(e) => setJob({ ...job, title: e.target.value })} /></Field>
        </div>
        <Field label="Descrição da vaga (cole o texto completo)" className="mt-2">
          <Textarea className="min-h-[140px]" value={job.description} onChange={(e) => setJob({ ...job, description: e.target.value })} />
        </Field>
        <Field label="Links sobre a empresa ou vaga (opcional, um por linha)" className="mt-2" hint="Página de carreiras, post no LinkedIn, blog de engenharia. O servidor baixa o texto e passa como contexto.">
          <Textarea className="min-h-[56px]" value={job.linksText} onChange={(e) => setJob({ ...job, linksText: e.target.value })} />
        </Field>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={job.webSearch} onChange={(e) => setJob({ ...job, webSearch: e.target.checked })} />
          Buscar na web sobre a empresa e a vaga
          <span className="text-xs text-zinc-500">(Tavily/Brave se tiver chave, senão DuckDuckGo)</span>
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="primary" busy={busy === "one"} disabled={busy !== null} onClick={() => run(false)}>Gerar versão para a vaga</Button>
          <Button busy={busy === "two"} disabled={busy !== null || !canCompare} onClick={() => run(true)} title={canCompare ? "" : "Configure um provider de comparação"}>
            Comparar 2 providers
          </Button>
          <span className="text-xs text-zinc-500">{researching ? "Com pesquisa. " : "Sem pesquisa. "}1 chamada de LLM por provider.</span>
        </div>
        {error ? <div className="mt-2"><ErrorBox message={error} onClose={() => setError(null)} /></div> : null}
      </div>

      {sources.length ? (
        <div className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          Fontes: {sources.map((s, i) => <span key={i} className={cx("mr-2", !s.ok && "line-through opacity-60")}>{s.url}</span>)}
        </div>
      ) : null}

      {results.length ? (
        <div className={cx("grid gap-3", results.length > 1 && "lg:grid-cols-2")}>
          {results.map((r) => (
            <div key={r.providerId} className="rounded-lg border border-zinc-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">{r.providerName}</span>
                {r.resume ? <Button size="sm" variant="primary" busy={saving === r.providerId} onClick={() => save(r)}>Usar esta versão</Button> : null}
              </div>
              {r.error ? <ErrorBox message={r.error} /> : r.resume ? <ResultView resume={r.resume} /> : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-lg border border-zinc-200 bg-white p-3">
        <h2 className="mb-2 text-sm font-semibold">Versões salvas</h2>
        {tailored.length === 0 ? <p className="text-xs text-zinc-500">Nenhuma ainda. Gere uma versão e clique em &ldquo;Usar esta versão&rdquo;.</p> : null}
        <ul className="space-y-1">
          <li className={cx("flex items-center gap-2 rounded px-2 py-1 text-sm", selectedTailoredId === null && "bg-zinc-100")}>
            <button type="button" className="flex-1 text-left" onClick={() => onPreview(null)}>Original (sem personalização)</button>
          </li>
          {tailored.map((t) => (
            <li key={t.id} className={cx("flex items-center gap-2 rounded px-2 py-1 text-sm", selectedTailoredId === t.id && "bg-zinc-100")}>
              <button type="button" className="flex-1 text-left" onClick={() => onPreview(t.id)}>
                {t.company || "?"} · {t.jobTitle || "?"} <span className="text-xs text-zinc-500">({t.provider}, {new Date(t.createdAt).toLocaleDateString("pt-BR")})</span>
              </button>
              <a className="text-xs text-zinc-600 underline" href={api.downloadUrl({ tailoredId: t.id })}>PDF</a>
              <Button size="sm" variant="danger" onClick={async () => { await api.deleteTailored(t.id); onDeleted(t.id); }}>×</Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ResultView({ resume }: { resume: Resume }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="text-zinc-700">{resume.summary}</p>
      <div className="flex flex-wrap gap-1">
        {resume.skills.map((s, i) => <span key={i} className="rounded-full bg-zinc-100 px-2 text-xs">{s}</span>)}
      </div>
      {resume.experiences.map((e, i) => (
        <div key={i}>
          <div className="font-medium">{e.role} · {e.company}</div>
          <ul className="list-disc pl-5 text-zinc-700">
            {e.bullets.map((b, j) => <li key={j}>{b}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}
