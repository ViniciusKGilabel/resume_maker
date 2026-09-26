"use client";
import { useEffect, useState } from "react";
import { api, type AppSettings, type Preset, type ProviderConfig } from "@/src/ui/api";
import { ModelPicker, NO_AUTOFILL, TierBadge } from "./ModelPicker";
import { Button, ErrorBox, Field, Input, Select, cx } from "./ui";

export function SettingsDrawer({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (s: AppSettings) => void }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string>("");
  /** null: fechado; "new": adicionar; id: trocar modelo de um provider existente. */
  const [picker, setPicker] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    api.getSettings().then((r) => { setSettings(r.settings); setSaved(JSON.stringify(r.settings)); setPresets(r.presets); }).catch((e) => setError((e as Error).message));
  }, [open]);

  const dirty = settings !== null && JSON.stringify(settings) !== saved;
  const requestClose = () => {
    if (dirty && !confirm("Há alterações não salvas. Descartar?")) return;
    onClose();
  };

  useEffect(() => {
    if (!open || picker) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") requestClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!open) return null;

  const update = (patch: Partial<AppSettings>) => { setNotice(null); setSettings((s) => (s ? { ...s, ...patch } : s)); };
  const updateProvider = (id: string, patch: Partial<ProviderConfig>) =>
    update({ providers: settings!.providers.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  const removeProvider = (id: string) => {
    if (!settings) return;
    const providers = settings.providers.filter((p) => p.id !== id);
    update({
      providers,
      activeProviderId: settings.activeProviderId === id ? (providers[0]?.id ?? null) : settings.activeProviderId,
      compareProviderId: settings.compareProviderId === id ? null : settings.compareProviderId,
    });
  };

  /** Salva na sessão do servidor. close=false mantém a gaveta aberta (usado pelo seletor de modelo). */
  const save = async (next: AppSettings | null = settings, close = true) => {
    if (!next) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.saveSettings(next);
      setSettings(result);
      setSaved(JSON.stringify(result));
      onSaved(result);
      if (close) onClose();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onPicked = (p: ProviderConfig) => {
    if (!settings) return;
    const exists = settings.providers.some((x) => x.id === p.id);
    const providers = exists ? settings.providers.map((x) => (x.id === p.id ? p : x)) : [...settings.providers, p];
    setPicker(null);
    save({ ...settings, providers, activeProviderId: settings.activeProviderId ?? p.id }, false).then((ok) => {
      if (ok) setNotice(`✓ ${p.name}: modelo ${p.model} salvo.`);
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={requestClose}>
      <aside className="flex h-full w-full max-w-xl flex-col bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-base font-semibold">Configurações</h2>
          <Button variant="ghost" onClick={requestClose}>Fechar</Button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {error ? <ErrorBox message={error} onClose={() => setError(null)} /> : null}
          {notice ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</p> : null}
          {!settings ? <p className="text-sm text-zinc-500">Carregando…</p> : (
            <>
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Providers de LLM</h3>
                  <Button size="sm" variant="primary" onClick={() => setPicker("new")}>+ Adicionar IA</Button>
                </div>
                <p className="mb-2 text-xs text-zinc-500">Providers, modelos e chaves ficam só na memória do servidor, presos a esta sessão do navegador. Somem ao fechar o navegador, após 2h sem uso ou ao reiniciar o app.</p>
                {settings.providers.length === 0 ? (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Nenhuma IA configurada nesta sessão. Clique em “+ Adicionar IA”. OpenRouter, Groq e Gemini têm opções gratuitas.</p>
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
                          <Field label="API key" hint={preset?.notes}><Input type="password" {...NO_AUTOFILL} value={p.apiKey} placeholder="cole a chave" onChange={(e) => updateProvider(p.id, { apiKey: e.target.value })} /></Field>
                          <Field label="Modelo">
                            <div className="flex items-center gap-1">
                              <Input className="min-w-0 flex-1 font-mono" value={p.model} onChange={(e) => updateProvider(p.id, { model: e.target.value })} />
                              <Button size="sm" onClick={() => setPicker(p.id)} title="Ver modelos com custo e descrição">Escolher…</Button>
                            </div>
                          </Field>
                        </div>
                        {preset ? <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500"><TierBadge tier={preset.tier} />{preset.description}</div> : null}
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
                  <Field label="Tavily API key"><Input type="password" {...NO_AUTOFILL} value={settings.search.tavilyKey} onChange={(e) => update({ search: { ...settings.search, tavilyKey: e.target.value } })} /></Field>
                  <Field label="Brave Search API key"><Input type="password" {...NO_AUTOFILL} value={settings.search.braveKey} onChange={(e) => update({ search: { ...settings.search, braveKey: e.target.value } })} /></Field>
                </div>
              </section>
            </>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-zinc-200 px-4 py-3">
          {dirty ? (
            <>
              <span className="mr-auto self-center text-xs text-amber-600">alterações não salvas</span>
              <Button onClick={requestClose}>Cancelar</Button>
              <Button variant="primary" busy={busy} onClick={() => save()}>Salvar</Button>
            </>
          ) : (
            <>
              <span className="mr-auto self-center text-xs text-emerald-700">{settings ? "✓ Tudo salvo nesta sessão" : ""}</span>
              <Button variant="primary" onClick={onClose}>Fechar</Button>
            </>
          )}
        </footer>
      </aside>
      {picker ? (
        <ModelPicker
          presets={presets}
          provider={picker === "new" ? undefined : settings?.providers.find((x) => x.id === picker)}
          onConfirm={onPicked}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </div>
  );
}
