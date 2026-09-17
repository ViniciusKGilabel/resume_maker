# Resume Maker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página única em Next.js que edita currículos, melhora/personaliza texto via LLM configurável, importa PDF sem LLM e exporta PDF textual, tudo num container leve.

**Architecture:** Next.js 15 App Router em `output: standalone`; route handlers em `app/api/*` são o backend. Lógica de domínio em `src/*` (db, llm, research, import, pdf), sem dependência de Next, testável com Vitest. SQLite em `./data`.

**Tech Stack:** Next 15, React 19, TypeScript, Tailwind 4, better-sqlite3, @react-pdf/renderer, pdf-parse, Vitest, node:22-alpine.

**Spec:** `docs/superpowers/specs/2026-09-17-resume-maker-design.md`

## Global Constraints

- Node 22, `output: 'standalone'`, um único container.
- Nenhuma chamada de LLM no import de PDF nem na geração de PDF.
- Uma chamada de LLM por operação (`polish`, `tailor`); comparação = 2 chamadas paralelas.
- PDF: texto real, coluna principal desenhada antes da lateral.
- UI em PT-BR; idioma do currículo `pt-BR` | `en`.
- Sem SDKs de LLM: `fetch` puro.
- Commits pequenos após cada tarefa.

---

### Task 1: Scaffold + tipos

**Files:** `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `app/layout.tsx`, `app/globals.css`, `src/types/resume.ts`, `.gitignore`

**Produces:** `Resume`, `Experience`, `Education`, `Certification`, `Language`, `ResumeLanguage = 'pt-BR' | 'en'`, `TemplateId = 'two-column' | 'single-column'`, `emptyResume(): Resume`.

- [ ] `npm create next-app` (TS, Tailwind, App Router, src desligado) e ajustar `next.config.ts` com `output: 'standalone'` e `serverExternalPackages: ['better-sqlite3', 'pdf-parse', '@react-pdf/renderer']`.
- [ ] Vitest configurado com `environment: node`, alias `@/`.
- [ ] Teste: `emptyResume()` retorna arrays vazios e strings vazias.
- [ ] Commit `chore: scaffold next + vitest + tipos`.

### Task 2: Banco (SQLite)

**Files:** `src/db/connection.ts`, `src/db/schema.ts`, `src/db/resumes.ts`, `src/db/tailored.ts`, `src/db/settings.ts`, `tests/db.test.ts`

**Produces:**
- `getDb(path?: string): Database` (singleton; `DATA_DIR` env, default `./data`; `:memory:` nos testes).
- `resumesRepo`: `list()`, `get(id)`, `create({name, language, template, data})`, `update(id, patch)`, `remove(id)`.
- `tailoredRepo`: `listByResume(resumeId)`, `get(id)`, `create({...})`, `remove(id)`.
- `settingsRepo`: `get<T>(key, fallback)`, `set(key, value)`, `getAll()`.
- `AppSettings` type: `{ providers: ProviderConfig[]; activeProviderId: string|null; compareProviderId: string|null; search: { tavilyKey: string; braveKey: string } }`.

- [ ] Teste: cria resume, lê, atualiza `data`, lista, remove; tailored vinculado é removido em cascata; settings round-trip JSON.
- [ ] Implementar com `CREATE TABLE IF NOT EXISTS`, ids `crypto.randomUUID()`, JSON em coluna TEXT.
- [ ] Commit `feat(db): sqlite repositórios`.

### Task 3: LLM (drivers, presets, prompts)

**Files:** `src/llm/types.ts`, `src/llm/json.ts`, `src/llm/presets.ts`, `src/llm/drivers/openaiCompatible.ts`, `src/llm/drivers/anthropic.ts`, `src/llm/client.ts`, `src/llm/prompts/polish.ts`, `src/llm/prompts/tailor.ts`, `src/llm/service.ts`, `tests/llm.test.ts`

**Produces:**
- `ProviderConfig = { id; name; kind: 'openai-compatible' | 'anthropic'; baseUrl; apiKey; model }`.
- `PRESETS: { id; name; kind; baseUrl; model; notes }[]` (openrouter-free, groq, gemini, deepseek, ollama, anthropic).
- `chatJson(provider, { system, user, maxTokens }): Promise<unknown>` — faz a request e retorna JSON parseado; erro vira `LlmError(status, message)`.
- `extractJson(text: string): unknown` — tolera cercas ```json e texto antes/depois.
- `polishExperience(provider, exp: Experience, language): Promise<{ bullets: string[] }>`.
- `tailorResume(provider, resume, job: JobInput, research: string, language): Promise<Resume>`.
- `JobInput = { company; title; description; links: string[]; webSearch: boolean }`.

- [ ] Testes: `extractJson` com/sem cercas; driver openai monta `chat/completions` com `response_format json_object`, header Bearer; driver anthropic monta `/v1/messages` com `x-api-key` e `anthropic-version`; erro 401 vira LlmError; `polishExperience` valida shape e descarta bullets vazios; `tailorResume` mantém campos de contato originais (não deixa a LLM inventar contato).
- [ ] Prompts com regras anti-jargão (lista explícita) e "não inventar métricas/experiência".
- [ ] Commit `feat(llm): drivers, presets e prompts`.

### Task 4: Pesquisa (links + busca web)

**Files:** `src/research/html.ts`, `src/research/fetchPage.ts`, `src/research/providers/ddg.ts`, `src/research/providers/tavily.ts`, `src/research/providers/brave.ts`, `src/research/index.ts`, `tests/research.test.ts`, `tests/fixtures/ddg.html`

**Produces:**
- `htmlToText(html): string` (remove script/style/nav, colapsa espaços).
- `fetchPageText(url, { timeoutMs=8000, maxChars=3000 }): Promise<string>`.
- `SearchResult = { title; url; snippet }`; `searchDdg(q)`, `searchTavily(q, key)`, `searchBrave(q, key)`: `Promise<SearchResult[]>`.
- `buildResearchContext(job: JobInput, settings: AppSettings['search'], deps?): Promise<string>` — vazio se sem links e sem webSearch; prioridade Tavily > Brave > DDG; 4 resultados; falhas individuais ignoradas.

- [ ] Testes: `htmlToText` remove scripts; DDG parser extrai títulos/urls da fixture (`result__a`, `result__snippet`); `buildResearchContext` sem nada retorna `''`; com links usa `fetchPageText` mockado; com webSearch e chave Tavily não chama DDG.
- [ ] Commit `feat(research): links e busca web`.

### Task 5: Import de PDF (sem LLM)

**Files:** `src/import/extractText.ts`, `src/import/heuristics.ts`, `tests/import.test.ts`, `tests/fixtures/resume-pt.txt`, `tests/fixtures/resume-en.txt`

**Produces:**
- `extractPdfText(buffer: Buffer): Promise<string>` (pdf-parse).
- `parseResumeText(text: string): Partial<Resume>` — contato por regex, seções por títulos PT/EN, experiências quebradas por linhas com datas, bullets por `-•*`, skills por vírgula/linha.

- [ ] Testes com fixtures: email/telefone/linkedin, nome na primeira linha, 2 experiências detectadas com empresa/período, skills lista, formação.
- [ ] Commit `feat(import): heurística de currículo`.

### Task 6: PDF (templates)

**Files:** `src/pdf/registry.ts`, `src/pdf/theme.ts`, `src/pdf/templates/TwoColumn.tsx`, `src/pdf/templates/SingleColumn.tsx`, `src/pdf/render.ts`, `src/pdf/labels.ts`, `tests/pdf.test.ts`

**Produces:**
- `TEMPLATES: Record<TemplateId, { id; name; component: (p: { resume: Resume; language: ResumeLanguage }) => ReactElement }>`.
- `renderResumePdf(resume, { template, language }): Promise<Buffer>`; metadata `title`, `author`.
- `labels(language)`: títulos de seção PT/EN.

- [ ] Testes: gera os dois templates, `extractPdfText` do resultado contém nome e uma bullet; no two-column o índice do texto do resumo é menor que o do email (principal antes da lateral).
- [ ] Commit `feat(pdf): templates two-column e single-column`.

### Task 7: API routes

**Files:** `app/api/resumes/route.ts`, `app/api/resumes/[id]/route.ts`, `app/api/resumes/[id]/tailored/route.ts`, `app/api/tailored/[id]/route.ts`, `app/api/settings/route.ts`, `app/api/llm/polish/route.ts`, `app/api/llm/tailor/route.ts`, `app/api/import/pdf/route.ts`, `app/api/export/pdf/route.ts`, `src/server/settings.ts`, `src/server/errors.ts`

**Produces:** contratos JSON:
- `GET/POST /api/resumes`, `GET/PUT/DELETE /api/resumes/:id`.
- `GET/POST /api/resumes/:id/tailored`, `DELETE /api/tailored/:id`.
- `GET/PUT /api/settings` (GET mascara chaves como `••••abcd`, PUT mantém chave anterior se vier mascarada).
- `POST /api/llm/polish { experience, language }` → `{ bullets }`.
- `POST /api/llm/tailor { resumeId, job, compare }` → `{ results: { providerId; providerName; resume?; error? }[]; research: string }`.
- `POST /api/import/pdf` multipart `file` → `{ draft: Partial<Resume>, rawText }`.
- `GET /api/export/pdf?resumeId=&tailoredId=&template=` → `application/pdf`; `POST /api/export/pdf { resume, template, language }` para preview do rascunho não salvo.
- `src/server/settings.ts`: `loadSettings()`, `resolveProvider(id)`, seed de `.env` (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_KIND`) na primeira carga.

- [ ] Smoke manual com `curl` após `npm run dev`.
- [ ] Commit `feat(api): rotas`.

### Task 8: UI (página única)

**Files:** `app/page.tsx`, `src/ui/state.ts` (hook `useResumeStore`), `src/ui/api.ts` (client fetch), `src/ui/components/Editor/*.tsx` (Contact, Summary, Experiences, Education, Certifications, Skills, Languages, ImportPdf), `src/ui/components/Preview.tsx`, `src/ui/components/JobPanel.tsx`, `src/ui/components/SettingsDrawer.tsx`, `src/ui/components/ui.tsx` (Button, Input, Textarea, Section)

- [ ] Header: seletor de currículo (lista/criar/apagar), nome, idioma, template, botão Configurações, Baixar PDF.
- [ ] Editor com seções colapsáveis, `polish` por experiência com antes/depois e aceitar/rejeitar, auto-save com debounce 1 s em PUT.
- [ ] Preview: `POST /api/export/pdf` com debounce 800 ms → blob URL num `<iframe>`.
- [ ] Aba Vaga: form, gerar/comparar, cards lado a lado, "Usar esta versão" (POST tailored) e seletor de versão para preview/download.
- [ ] Drawer Configurações: presets, lista de providers, ativo/comparação, chaves de busca.
- [ ] Commit `feat(ui): página única`.

### Task 9: Docker + docs

**Files:** `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.example`, `README.md`

- [ ] Multi-stage alpine; `better-sqlite3` requer `python3 make g++` no stage deps; runner copia `standalone`, `static`, `public`; `USER node`; `DATA_DIR=/app/data`.
- [ ] `docker compose build` e `docker compose up` sobem; `curl localhost:3000/api/settings` responde.
- [ ] README: como rodar, providers free, variáveis.
- [ ] Commit `chore(docker): imagem e compose`.
