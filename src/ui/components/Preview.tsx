"use client";
import { useEffect, useRef, useState } from "react";
import type { Resume, ResumeLanguage, TemplateId } from "@/src/types/resume";
import { api } from "@/src/ui/api";
import { Spinner } from "./ui";

/**
 * Dois iframes alternados (double buffer): o PDF novo carrega no iframe oculto e só troca de
 * visível depois do onLoad. Trocar o src de um único iframe faz o plugin de PDF do navegador
 * recarregar do zero e piscar; isto evita o flash mantendo o PDF antigo visível até o novo estar pronto.
 */
export function Preview({ resume, template, language }: { resume: Resume; template: TemplateId; language: ResumeLanguage }) {
  const [urls, setUrls] = useState<[string | null, string | null]>([null, null]);
  const [active, setActive] = useState<0 | 1>(0);
  const activeRef = useRef<0 | 1>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const key = JSON.stringify({ resume, template, language });

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const blob = await api.previewPdf(resume, template, language, ctrl.signal);
        if (ctrl.signal.aborted) return;
        const next = activeRef.current === 0 ? 1 : 0;
        const newUrl = URL.createObjectURL(blob);
        setUrls((prev) => {
          const updated: [string | null, string | null] = [...prev];
          const old = updated[next];
          updated[next] = newUrl;
          if (old) URL.revokeObjectURL(old);
          return updated;
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

  const handleBufferedLoad = (idx: 0 | 1) => {
    if (idx !== activeRef.current) setActive(idx);
  };

  const hasPdf = urls[0] || urls[1];

  return (
    <div className="relative flex h-full min-h-[70vh] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200">
      {loading ? (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs shadow">
          <Spinner /> gerando PDF
        </div>
      ) : null}
      {error ? <div className="bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
      {hasPdf ? (
        <div className="relative flex-1">
          {([0, 1] as const).map((idx) =>
            urls[idx] ? (
              <iframe
                key={idx}
                title="Preview do currículo"
                src={`${urls[idx]}#toolbar=0&navpanes=0&view=FitH`}
                onLoad={() => handleBufferedLoad(idx)}
                className={`absolute inset-0 h-full w-full transition-opacity duration-150 ${
                  active === idx ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              />
            ) : null,
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">Preencha o currículo para ver o PDF aqui.</div>
      )}
    </div>
  );
}
