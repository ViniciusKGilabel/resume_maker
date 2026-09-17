"use client";
import { useEffect, useState } from "react";
import { api, type AppSettings, type Preset, type ProviderConfig } from "@/src/ui/api";
import { Button, ErrorBox, Field, Input, Select, cx } from "./ui";

export function SettingsDrawer({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (s: AppSettings) => void }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [models, setModels] = useState<Record<string, string[]>>({});
  const [loadingModels, setLoadingModels] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    api.getSettings().then((r) => { setSettings(r.settings); setPresets(r.presets); }).catch((e) => setError((e as Error).message));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const update = (patch: Partial<AppSettings>) => setSettings((s) => (s ? { ...s, ...patch } : s));
  const updateProvider = (id: string, patch: Partial<ProviderConfig>) =>
    update({ providers: settings!.providers.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  const addFromPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset || !settings) return;
    const p: ProviderConfig = { id: crypto.randomUUID(), name: preset.name, kind: preset.kind, baseUrl: preset.baseUrl, apiKey: "", model: preset.model };
    update({ providers: [...settings.providers, p], activeProviderId: settings.activeProviderId ?? p.id });
  };

  const removeProvider = (id: string) => {
    if (!settings) return;
    const providers = settings.providers.filter((p) => p.id !== id);
    update({
      providers,
      activeProviderId: settings.activeProviderId === id ? (providers[0]?.id ?? null) : settings.activeProviderId,
      compareProviderId: settings.compareProviderId === id ? null : settings.compareProviderId,
    });
  };

  const loadModels = async (p: ProviderConfig) => {
    setLoadingModels(p.id);
    setError(null);
    try {
      setModels((m) => ({ ...m, [p.id]: [] }));
      const list = await api.listModels(p);
      setModels((m) => ({ ...m, [p.id]: list }));
    } catch (e) {
      setError(`Não consegui listar modelos: ${(e as Error).message}`);
    } finally {
      setLoadingModels(null);
    }
  };

  const save = async () => {
    if (!settings) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await api.saveSettings(settings);
      setSettings(saved);
      onSaved(saved);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <aside className="flex h-full w-full max-w-xl flex-col bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-base font-semibold">Configurações</h2>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {error ? <ErrorBox message={error} onClose={() => setError(null)} /> : null}
          {!settings ? <p className="text-sm text-zinc-500">Carregando…</p> : (
            <>
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Providers de LLM</h3>
                  <Select className="w-auto" value="" onChange={(e) => addFromPreset(e.target.value)}>
                    <option value="">+ Adicionar a partir de preset…</option>
                    {presets.map((p) => <option key={p.id} value={p.id}>{p.name}{p.free ? " · grátis" : ""}</option>)}
                  </Select>
                </div>
                {settings.providers.length === 0 ? (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Nenhum provider. Adicione um preset acima. OpenRouter, Groq e Gemini têm modelos gratuitos.</p>
                ) : null}
                <div className="space-y-3">
                  {settings.providers.map((p) => {
                    const preset = presets.find((x) => x.baseUrl === p.baseUrl);
                    return (
                      <div key={p.id} className={cx("rounded-md border p-3", settings.activeProviderId === p.id ? "border-zinc-800" : "border-zinc-200")}>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Field label="Nome"><Input value={p.name} onChange={(e) => updateProvider(p.id, { name: e.target.value })} /></Field>
                          <Field label="Tipo">
                            <Select value={p.kind} onChange={(e) => updateProvider(p.id, { kind: e.target.value as ProviderConfig["kind"] })}>
                              <option value="openai-compatible">OpenAI-compatible</option>
                              <option value="anthropic">Anthropic</option>
                            </Select>
                          </Field>
                          <Field label="Base URL" className="sm:col-span-2"><Input value={p.baseUrl} onChange={(e) => updateProvider(p.id, { baseUrl: e.target.value })} /></Field>
                          <Field label="API key" hint={preset?.notes}><Input type="password" value={p.apiKey} placeholder="cole a chave" onChange={(e) => updateProvider(p.id, { apiKey: e.target.value })} /></Field>
                          <Field label="Modelo">
                            <div className="flex gap-1">
                              <Input className="min-w-0 flex-1" list={`models-${p.id}`} value={p.model} onChange={(e) => updateProvider(p.id, { model: e.target.value })} />
                              <datalist id={`models-${p.id}`}>{(models[p.id] ?? []).map((m) => <option key={m} value={m} />)}</datalist>
                              <Button size="sm" busy={loadingModels === p.id} onClick={() => loadModels(p)} title="Lista os modelos do provider">↻</Button>
                            </div>
                          </Field>
                        </div>
                        {models[p.id]?.length ? <p className="mt-1 text-xs text-zinc-500">{models[p.id].length} modelos carregados. Digite no campo para filtrar.</p> : null}
                        <div className="mt-2 flex items-center gap-3 text-xs">
                          <label className="flex items-center gap-1"><input type="radio" name="active" checked={settings.activeProviderId === p.id} onChange={() => update({ activeProviderId: p.id })} /> principal</label>
                          <label className="flex items-center gap-1"><input type="radio" name="compare" checked={settings.compareProviderId === p.id} onChange={() => update({ compareProviderId: p.id })} /> comparação</label>
                          <span className="flex-1" />
                          <Button size="sm" variant="danger" onClick={() => removeProvider(p.id)}>Remover</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {settings.compareProviderId ? <Button size="sm" variant="ghost" className="mt-2" onClick={() => update({ compareProviderId: null })}>Desativar comparação</Button> : null}
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold">Busca na web (opcional)</h3>
                <p className="mb-2 text-xs text-zinc-500">Sem chave, a busca usa DuckDuckGo (gratuito, menos confiável). Com chave, usa Tavily ou Brave.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Tavily API key"><Input type="password" value={settings.search.tavilyKey} onChange={(e) => update({ search: { ...settings.search, tavilyKey: e.target.value } })} /></Field>
                  <Field label="Brave Search API key"><Input type="password" value={settings.search.braveKey} onChange={(e) => update({ search: { ...settings.search, braveKey: e.target.value } })} /></Field>
                </div>
              </section>
            </>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-zinc-200 px-4 py-3">
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" busy={busy} onClick={save} disabled={!settings}>Salvar</Button>
        </footer>
      </aside>
    </div>
  );
}
