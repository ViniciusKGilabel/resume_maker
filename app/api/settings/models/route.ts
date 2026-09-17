import { listModels } from "@/src/llm/client";
import { handle, readJson } from "@/src/server/errors";
import { loadSettings, mergeIncoming } from "@/src/server/settings";
import type { ProviderConfig } from "@/src/llm/types";

/** Lista modelos do provider informado (chave mascarada é resolvida pelo settings salvo). */
export const POST = handle(async (req: Request) => {
  const body = await readJson<{ provider: ProviderConfig }>(req);
  const current = loadSettings();
  const merged = mergeIncoming(current, { providers: [body.provider] });
  const p = merged.providers[0];
  let models = await listModels(p);
  if (p.baseUrl.includes("openrouter.ai")) {
    const free = models.filter((m) => m.endsWith(":free"));
    if (free.length) models = [...free, ...models.filter((m) => !m.endsWith(":free"))];
  }
  return Response.json({ models });
});
