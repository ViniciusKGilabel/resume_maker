# Resume Maker — Design

Data: 2026-09-17

## Objetivo

Aplicação de página única para montar currículos, melhorar o texto das experiências com LLM
(linguagem profissional, sem "cara de LLM"), personalizar o currículo para uma vaga/empresa e
exportar em PDF legível por qualquer leitor e por ATS. Sem login. Roda inteira num único
container Docker leve.

## Decisões fechadas

| Tema | Decisão |
|---|---|
| Arquitetura | Um container: Next.js 15 App Router em `output: standalone`; backend = route handlers em `app/api/*` |
| Persistência | SQLite (`better-sqlite3`) num volume `./data` |
| Idioma | UI em PT-BR; idioma do currículo escolhido por currículo (`pt-BR` ou `en`) |
| Import de PDF | `pdf-parse` + heurística, **sem LLM**; a pessoa completa os campos |
| Configuração de LLM | Painel na própria página, salvo no SQLite; `.env` opcional como seed |
| Providers | Driver `openai-compatible` (OpenRouter free, Groq, Gemini, DeepSeek, Ollama) e driver `anthropic`, ambos via `fetch`, sem SDK |
| Pesquisa para vaga | Checkbox "buscar na web" + campo de links opcionais. Sem nenhum dos dois: não pesquisa |
| Fonte de busca | Tavily ou Brave se houver chave; senão DuckDuckGo HTML |
| Comparação | Mesma geração em dois providers em paralelo, lado a lado, a pessoa escolhe qual salvar |
| PDF | `@react-pdf/renderer`, texto real, fontes embutidas, sem Chromium |
| Templates | `two-column` (lateral: contato, skills, idiomas; principal: resumo, experiência, formação, certificados) e `single-column`. Registry para adicionar mais |
| Ordem de leitura | No PDF a coluna principal é desenhada antes da lateral |
| Preview | O próprio PDF num `<iframe>`, regerado com debounce |

## Estrutura

```
app/
  page.tsx                 página única
  api/resumes/             CRUD de currículos
  api/resumes/[id]/tailored  versões por vaga
  api/llm/polish           reescreve uma experiência
  api/llm/tailor           personaliza para vaga (1 ou 2 providers)
  api/import/pdf           extrai texto + heurística
  api/export/pdf           gera PDF (query: resumeId | tailoredId, template)
  api/settings             providers, chaves, busca
src/
  db/                      conexão, migrations, repositórios
  llm/                     drivers, presets, prompts, json parsing
  pdf/                     registry + templates
  import/                  pdf-parse + heurística
  research/                ddg, tavily, brave, fetch de links, extração de texto
  types/                   tipos do currículo
Dockerfile, docker-compose.yml
```

## Modelo de dados

```ts
type Resume = {
  contact: { name; title; email; phone; location; linkedin; github; website }
  summary: string
  experiences: { company; role; start; end; location; bullets: string[]; raw?: string }[]
  education: { institution; degree; start; end }[]
  certifications: { name; issuer; year }[]
  skills: string[]
  languages: { name; level }[]
}
```

Tabelas:

- `resumes(id, name, language, template, data JSON, created_at, updated_at)`
- `tailored_resumes(id, resume_id, company, job_title, job_description, links, provider, data JSON, created_at)`
- `settings(key, value JSON)` — chaves: `providers[]`, `activeProvider`, `compareProvider`, `search.tavilyKey`, `search.braveKey`

## LLM

- Uma chamada por operação. `temperature` 0.3, saída JSON estrita (prompt pede JSON; parser tolera cercas de código).
- `polish(experience, language)` → `{ bullets: string[] }`. Regras do prompt: verbo de ação + contexto + resultado; manter números dados pela pessoa; nunca inventar métricas; proibir jargão de LLM (leveraged, spearheaded, impactful, synergy, passionate, travessões, tríades de adjetivos); frases curtas; sem emojis.
- `tailor(resume, job, research, language)` → `Resume` completo reordenado e reescrito, priorizando palavras-chave da vaga sem inventar experiência. Resumo reescrito para a vaga. Skills reordenadas com as da vaga primeiro.
- Comparação: `Promise.allSettled` em dois providers; falha de um não derruba o outro.
- Erros de provider retornam 502 com a mensagem do provider.

## Pesquisa

- Links: `fetch` com timeout 8 s, strip de HTML para texto, limite 3000 chars por link.
- Busca web (checkbox): query `"<empresa>" <cargo>`; Tavily → Brave → DuckDuckGo HTML, 4 resultados, mesmo pipeline dos links.
- Resultado concatenado entra como contexto na chamada `tailor`. Sem chamada extra de LLM.

## Import de PDF

- `pdf-parse` → texto.
- Heurística: email/telefone/linkedin por regex; nome = primeira linha não vazia sem `@`; seções por títulos PT/EN; dentro de experiência, quebra por linhas com padrão de datas (`2021 - 2023`, `jan 2021 – atual`); bullets por linhas iniciadas com `-`, `•`, `*`.
- Devolve `Partial<Resume>` + `rawText` para a pessoa revisar.

## UI

Página única com três áreas:

1. Editor (esquerda): nome do currículo, idioma, template, importar PDF, seções colapsáveis, botão "Melhorar com IA" por experiência (mostra antes/depois, aceitar/rejeitar).
2. Preview (direita): `<iframe>` do PDF, debounce 800 ms, botão Baixar PDF.
3. Aba "Vaga": empresa, cargo, descrição, links, checkbox busca web, botão Gerar e botão Comparar. Resultado lado a lado, "Usar esta versão" salva em `tailored_resumes` e troca o preview.
4. Drawer Configurações: lista de providers (preset, base URL, chave, modelo), provider ativo, provider de comparação, chaves Tavily/Brave.

## Docker

- Multi-stage: `deps` (instala com toolchain para `better-sqlite3`), `builder` (`next build`), `runner` (`node:22-alpine`, usuário não-root, só `.next/standalone`, `.next/static`, `public`).
- Compose: serviço `app`, porta 3000, volume `./data:/app/data`, `env_file: .env` opcional.

## Testes (Vitest)

- Heurística de import com fixtures de texto PT e EN.
- Parser de JSON da LLM (com e sem cercas).
- Drivers com `fetch` mockado (formato de request e mapeamento de erro).
- Parsers de busca (DDG HTML fixture, Tavily/Brave JSON).
- Geração de PDF: gera e extrai texto com `pdf-parse`, verifica ordem principal antes de lateral.
