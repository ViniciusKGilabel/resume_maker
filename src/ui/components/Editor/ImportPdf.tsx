"use client";
import { useRef, useState } from "react";
import type { Resume } from "@/src/types/resume";
import { api } from "@/src/ui/api";
import { Button, ErrorBox } from "../ui";

export function ImportPdf({ onImported }: { onImported: (draft: Partial<Resume>) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { draft } = await api.importPdf(file);
      const found = [
        draft.contact?.name && "contato",
        draft.summary && "resumo",
        draft.experiences?.length && `${draft.experiences.length} experiência(s)`,
        draft.education?.length && "formação",
        draft.skills?.length && `${draft.skills.length} skills`,
      ].filter(Boolean);
      onImported(draft);
      setInfo(found.length ? `Importado sem IA: ${found.join(", ")}. Revise e complete os campos.` : "Texto extraído, mas não reconheci as seções. Preencha os campos manualmente.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <Button busy={busy} onClick={() => input.current?.click()}>📄 Importar PDF existente</Button>
      <span className="ml-2 text-xs text-zinc-500">Leitura por heurística, sem LLM. Substitui os campos reconhecidos.</span>
      {info ? <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{info}</div> : null}
      {error ? <ErrorBox message={error} onClose={() => setError(null)} /> : null}
    </div>
  );
}
