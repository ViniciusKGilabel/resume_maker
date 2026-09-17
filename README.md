# Resume Maker

Página única para montar currículos, melhorar o texto com LLM, personalizar para uma vaga e exportar PDF.

- **Melhorar com IA**: reescreve cada experiência em linguagem profissional, sem jargão de IA e sem inventar números.
- **Personalizar para vaga**: adapta resumo, ordem de skills e bullets à descrição da vaga e à empresa. Pode usar links que você colar e busca na web.
- **Comparar providers**: gera a mesma versão em dois LLMs lado a lado e você escolhe.
- **Importar PDF**: lê o texto do seu currículo atual sem LLM e preenche os campos.
- **Exportar PDF**: gerado no servidor sem LLM, com texto real e ordem de leitura correta para ATS e leitores de PDF.

## Rodar com Docker

```bash
cp .env.example .env   # opcional
docker compose up -d --build
```

Abra http://localhost:3000. Os dados ficam no volume `resume-data`.

Backup do banco:

```bash
docker compose cp app:/app/data/resume-maker.db ./backup.db
```

## Rodar sem Docker

Requer Node 22.

```bash
npm install
npm run dev     # desenvolvimento em http://localhost:3000
npm test        # testes
```

## Providers de LLM

Configure em **⚙ Configurações** na própria página. Cada provider tem base URL, chave e modelo. O botão ↻ lista os modelos disponíveis.

| Preset | Custo | Onde pegar a chave |
|---|---|---|
| OpenRouter | modelos `:free` gratuitos | openrouter.ai/keys |
| Groq | free tier com limite diário | console.groq.com |
| Google Gemini | free tier | aistudio.google.com |
| DeepSeek | pago, barato | platform.deepseek.com |
| Ollama | local, sem chave | use `http://host.docker.internal:11434/v1` |
| Anthropic Claude | pago | console.anthropic.com |

Qualquer API compatível com OpenAI funciona com o tipo `openai-compatible`.

Para comparar, marque um provider como **principal** e outro como **comparação**.

### Custo

- Melhorar uma experiência: 1 chamada.
- Personalizar para uma vaga: 1 chamada por provider. A pesquisa na web não usa LLM.
- Importar e exportar PDF: nenhuma chamada.

## Pesquisa para a vaga

- Sem links e sem a caixa de busca marcada, nada é pesquisado.
- Links colados: o servidor baixa o texto de cada página.
- Busca na web: usa Tavily ou Brave se houver chave nas configurações, senão DuckDuckGo.

## Templates de PDF

- **Duas colunas**: lateral com contato, habilidades e idiomas. Principal com resumo, experiência, formação e certificações.
- **Uma coluna**: tudo em sequência.

Para criar um template novo, adicione um componente em `src/pdf/templates/` e registre em `src/pdf/registry.ts`.

## Estrutura

```
app/            página e rotas de API (Next.js App Router)
src/db/         SQLite (better-sqlite3)
src/llm/        drivers, presets e prompts
src/research/   links e busca web
src/import/     leitura de PDF por heurística
src/pdf/        templates e geração de PDF (@react-pdf/renderer)
src/ui/         interface
tests/          Vitest
```
