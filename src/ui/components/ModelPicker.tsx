"use client";
import { useEffect, useMemo, useState } from "react";
import { api, type DescribedModel, type Preset, type ProviderConfig } from "@/src/ui/api";
import { Button, ErrorBox, Field, Input, cx } from "./ui";

type Tier = DescribedModel["tier"];

const TIER: Record<Tier, { label: string; cls: string }> = {
  free: { label: "Grátis", cls: "bg-emerald-100 text-emerald-800" },
  "free-limited": { label: "Grátis c/ limite", cls: "bg-sky-100 text-sky-800" },
  paid: { label: "Pago", cls: "bg-amber-100 text-amber-800" },
  unknown: { label: "Custo ?", cls: "bg-zinc-100 text-zinc-600" },
};

export function TierBadge({ tier }: { tier: Tier }) {
  const t = TIER[tier];
  return <span className={cx("shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium", t.cls)}>{t.label}</span>;
}

/** Atributos que fazem navegador e gerenciadores de senha (1Password, LastPass, Bitwarden) não preencherem o campo. */
export const NO_AUTOFILL = { autoComplete: "off", "data-1p-ignore": "true", "data-lpignore": "true", "data-bwignore": "true", "data-form-type": "other" } as const;

/**
 * Seletor em dois passos: provider (com custo e descrição) → chave + modelo.
 * Com `provider`, abre direto no passo 2 para trocar o modelo de um provider existente.
 */
export function ModelPicker({ presets, provider, onConfirm, onClose }: { presets: Preset[]; provider?: ProviderConfig; onConfirm: (p: ProviderConfig) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<ProviderConfig | null>(provider ?? null);
  const [models, setModels] = useState<DescribedModel[] | null>(null);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const preset = draft ? presets.find((p) => p.baseUrl === draft.baseUrl) : undefined;
  // Ollama e URLs próprias podem rodar sem chave.
  const needsKey = Boolean(preset && preset.id !== "ollama");

  const pickPreset = (p: Preset) => {
    setDraft({ id: crypto.randomUUID(), name: p.name, kind: p.kind, baseUrl: p.baseUrl, apiKey: "", model: p.model });
    setModels(null);
    setError(null);
  };

  const loadModels = async () => {
    if (!draft) return;
    setLoading(true);
    setError(null);
    try {
      setModels(await api.listModels(draft));
    } catch (e) {
      setError(`Não consegui listar os modelos: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (models ?? []).filter((m) => !q || m.id.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q));
  }, [models, filter]);

  const missing = !draft ? null : needsKey && !draft.apiKey ? "Falta a API key" : !draft.model.trim() ? "Escolha um modelo" : null;
  const canConfirm = Boolean(draft && !missing);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div role="dialog" aria-modal className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-base font-semibold">{!draft ? "Escolha a IA" : `${draft.name}: chave e modelo`}</h2>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {error ? <ErrorBox message={error} onClose={() => setError(null)} /> : null}

          {!draft ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {presets.map((p) => (
                <button key={p.id} type="button" onClick={() => pickPreset(p)} className="rounded-md border border-zinc-200 p-3 text-left hover:border-zinc-500 hover:bg-zinc-50">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{p.name}</span>
                    <TierBadge tier={p.tier} />
                  </div>
                  <p className="text-xs text-zinc-600">{p.description}</p>
                </button>
              ))}
            </div>
          ) : (
            <>
              {preset ? <p className="text-xs text-zinc-500">{preset.notes}</p> : null}
              {needsKey ? (
                <Field label="API key" hint="Fica só na memória do servidor até você fechar o navegador. Nunca é gravada em disco.">
                  <Input type="password" {...NO_AUTOFILL} value={draft.apiKey} placeholder="cole a chave" onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} />
                </Field>
              ) : null}

              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" busy={loading} onClick={loadModels} disabled={needsKey && !draft.apiKey}>Carregar modelos</Button>
                <span className="text-xs text-zinc-500">{needsKey && !draft.apiKey ? "Cole a chave para ver os modelos da sua conta." : "Lista os modelos disponíveis na sua conta."}</span>
              </div>

              {models ? (
                <div>
                  <Input value={filter} placeholder={`Filtrar ${models.length} modelos…`} onChange={(e) => setFilter(e.target.value)} />
                  <ul className="mt-2 max-h-72 divide-y divide-zinc-100 overflow-y-auto rounded-md border border-zinc-200">
                    {visible.map((m) => (
                      <li key={m.id}>
                        <label className={cx("flex cursor-pointer items-start gap-2 px-3 py-2 hover:bg-zinc-50", draft.model === m.id && "bg-zinc-100")}>
                          <input type="radio" name="model" className="mt-1" checked={draft.model === m.id} onChange={() => setDraft({ ...draft, model: m.id })} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-mono text-xs">{m.id}</span>
                            {m.description ? <span className="block text-xs text-zinc-500">{m.description}</span> : null}
                          </span>
                          <TierBadge tier={m.tier} />
                        </label>
                      </li>
                    ))}
                    {visible.length === 0 ? <li className="px-3 py-2 text-xs text-zinc-500">Nenhum modelo.</li> : null}
                  </ul>
                </div>
              ) : null}

              <Field label="Modelo selecionado" hint="Pode digitar o id direto se já souber.">
                <Input className="font-mono" value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} />
              </Field>
            </>
          )}
        </div>

        <footer className="flex justify-between gap-2 border-t border-zinc-200 px-4 py-3">
          {draft && !provider ? <Button variant="ghost" onClick={() => { setDraft(null); setModels(null); }}>← Outra IA</Button> : <span />}
          <div className="flex items-center gap-2">
            {draft && missing ? <span className="text-xs text-zinc-500">{missing}</span> : null}
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" disabled={!canConfirm} title={missing ?? undefined} onClick={() => draft && onConfirm({ ...draft, model: draft.model.trim() })}>Salvar modelo</Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
