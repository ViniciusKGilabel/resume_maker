"use client";
import { useEffect, useRef, useState } from "react";
import type { Resume, ResumeLanguage, TemplateId } from "@/src/types/resume";
import { api } from "@/src/ui/api";
import { Spinner } from "./ui";

export function Preview({ resume, template, language }: { resume: Resume; template: TemplateId; language: ResumeLanguage }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const key = JSON.stringify({ resume, template, language });

  useEffect(() => {
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const blob = await api.previewPdf(resume, template, language, ctrl.signal);
        if (ctrl.signal.aborted) return;
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
        setError(null);
      } catch (e) {
        if (!ctrl.signal.aborted) setError((e as Error).message);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className="relative flex h-full min-h-[70vh] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200">
      {loading ? (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs shadow">
          <Spinner /> gerando PDF
        </div>
      ) : null}
      {error ? <div className="bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
      {url ? (
        <iframe title="Preview do currículo" src={`${url}#toolbar=0&navpanes=0&view=FitH`} className="h-full w-full flex-1" />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">Preencha o currículo para ver o PDF aqui.</div>
      )}
    </div>
  );
}
