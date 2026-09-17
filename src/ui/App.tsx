"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Resume, ResumeLanguage, TemplateId } from "@/src/types/resume";
import { api, type AppSettings, type ResumeRow, type ResumeSummary, type TailoredRow } from "./api";
import { Editor } from "./components/Editor";
import { JobPanel } from "./components/JobPanel";
import { Preview } from "./components/Preview";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { Button, ErrorBox, Input, Select, cx } from "./components/ui";

type Tab = "editor" | "job";

export function App() {
  const [list, setList] = useState<ResumeSummary[]>([]);
  const [current, setCurrent] = useState<ResumeRow | null>(null);
  const [tailored, setTailored] = useState<TailoredRow[]>([]);
  const [previewTailoredId, setPreviewTailoredId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("editor");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving">("saved");
  const dirtyRef = useRef(false);

  const refreshList = useCallback(async () => setList(await api.listResumes()), []);

  const load = useCallback(async (id: string) => {
    const row = await api.getResume(id);
    setCurrent(row);
    setTailored(await api.listTailored(id));
    setPreviewTailoredId(null);
    setSaveState("saved");
    dirtyRef.current = false;
    try { localStorage.setItem("resume-maker:last", id); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [resumes, s] = await Promise.all([api.listResumes(), api.getSettings()]);
        setList(resumes);
        setSettings(s.settings);
        let last: string | null = null;
        try { last = localStorage.getItem("resume-maker:last"); } catch { /* ignore */ }
        const pick = resumes.find((r) => r.id === last) ?? resumes[0];
        if (pick) await load(pick.id);
        else {
          const created = await api.createResume({ name: "Meu currículo" });
          setList([{ id: created.id, name: created.name, language: created.language, template: created.template, updatedAt: created.updatedAt }]);
          await load(created.id);
        }
        if (s.settings.providers.length === 0) setSettingsOpen(true);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [load]);

  // Auto-save com debounce.
  useEffect(() => {
    if (!current || !dirtyRef.current) return;
    setSaveState("dirty");
    const t = setTimeout(async () => {
      setSaveState("saving");
      try {
        await api.updateResume(current.id, { name: current.name, language: current.language, template: current.template, data: current.data });
        dirtyRef.current = false;
        setSaveState("saved");
        refreshList();
      } catch (e) {
        setError((e as Error).message);
        setSaveState("dirty");
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [current, refreshList]);

  const patch = (p: Partial<Pick<ResumeRow, "name" | "language" | "template" | "data">>) => {
    dirtyRef.current = true;
    setCurrent((c) => (c ? { ...c, ...p } : c));
  };

  const createNew = async () => {
    const name = prompt("Nome do currículo", "Novo currículo");
    if (name === null) return;
    const created = await api.createResume({ name: name || "Novo currículo" });
    await refreshList();
    await load(created.id);
    setTab("editor");
  };

  const remove = async () => {
    if (!current || !confirm(`Apagar "${current.name}" e todas as versões por vaga?`)) return;
    await api.deleteResume(current.id);
    const rest = await api.listResumes();
    setList(rest);
    if (rest[0]) await load(rest[0].id);
    else {
      const created = await api.createResume({ name: "Meu currículo" });
      await refreshList();
      await load(created.id);
    }
  };

  const previewResume: Resume | null = useMemo(() => {
    if (!current) return null;
    const t = tailored.find((x) => x.id === previewTailoredId);
    return t ? t.data : current.data;
  }, [current, tailored, previewTailoredId]);

  const canCompare = Boolean(settings && settings.compareProviderId && settings.compareProviderId !== settings.activeProviderId);
  const downloadHref = current ? api.downloadUrl(previewTailoredId ? { tailoredId: previewTailoredId } : { resumeId: current.id }, current.template) : "#";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-4 py-2">
        <span className="text-base font-bold tracking-tight">Resume Maker</span>
        <Select className="w-auto max-w-[220px]" value={current?.id ?? ""} onChange={(e) => load(e.target.value)}>
          {list.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
        <Button size="sm" onClick={createNew}>+ Novo</Button>
        <Button size="sm" variant="danger" onClick={remove} disabled={!current}>Apagar</Button>
        <span className="mx-2 hidden h-5 w-px bg-zinc-200 sm:block" />
        {current ? (
          <>
            <Input className="w-40" value={current.name} onChange={(e) => patch({ name: e.target.value })} aria-label="Nome do currículo" />
            <Select className="w-auto" value={current.language} onChange={(e) => patch({ language: e.target.value as ResumeLanguage })} aria-label="Idioma">
              <option value="pt-BR">Português</option>
              <option value="en">English</option>
            </Select>
            <Select className="w-auto" value={current.template} onChange={(e) => patch({ template: e.target.value as TemplateId })} aria-label="Template">
              <option value="two-column">Duas colunas</option>
              <option value="single-column">Uma coluna</option>
            </Select>
          </>
        ) : null}
        <span className="flex-1" />
        <span className={cx("text-xs", saveState === "saved" ? "text-zinc-400" : "text-amber-600")}>
          {saveState === "saved" ? "salvo" : saveState === "saving" ? "salvando…" : "alterações pendentes"}
        </span>
        <a href={downloadHref} className={cx("rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700", !current && "pointer-events-none opacity-50")}>
          ⬇ Baixar PDF
        </a>
        <Button size="sm" onClick={() => setSettingsOpen(true)}>⚙ Configurações</Button>
      </header>

      {error ? <div className="px-4 pt-3"><ErrorBox message={error} onClose={() => setError(null)} /></div> : null}

      <main className="grid flex-1 gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="mb-3 flex gap-1 rounded-lg bg-zinc-200 p-1 text-sm">
            {(["editor", "job"] as Tab[]).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={cx("flex-1 rounded-md px-3 py-1.5 font-medium", tab === t ? "bg-white shadow" : "text-zinc-600 hover:text-zinc-900")}>
                {t === "editor" ? "Editor" : "Vaga"}
              </button>
            ))}
          </div>
          {current && tab === "editor" ? <Editor resume={current.data} language={current.language} onChange={(data) => patch({ data })} /> : null}
          {current && tab === "job" ? (
            <JobPanel
              resumeId={current.id}
              canCompare={canCompare}
              tailored={tailored}
              selectedTailoredId={previewTailoredId}
              onPreview={setPreviewTailoredId}
              onSaved={(row) => { setTailored((t) => [row, ...t]); setPreviewTailoredId(row.id); }}
              onDeleted={(id) => { setTailored((t) => t.filter((x) => x.id !== id)); if (previewTailoredId === id) setPreviewTailoredId(null); }}
            />
          ) : null}
        </div>
        <div className="min-w-0 lg:sticky lg:top-14 lg:h-[calc(100vh-4.5rem)]">
          {previewTailoredId ? (
            <div className="mb-2 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
              Mostrando versão personalizada.
              <button type="button" className="underline" onClick={() => setPreviewTailoredId(null)}>Ver original</button>
            </div>
          ) : null}
          {current && previewResume ? <Preview resume={previewResume} template={current.template} language={current.language} /> : null}
        </div>
      </main>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={setSettings} />
    </div>
  );
}
