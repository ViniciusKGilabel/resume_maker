import { listModels } from "@/src/llm/client";
import { describeModels } from "@/src/llm/modelInfo";
import { handle, readJson } from "@/src/server/errors";
import { loadSettings, mergeIncoming } from "@/src/server/settings";
import type { ProviderConfig } from "@/src/llm/types";

/** Lista modelos do provider informado (chave mascarada é resolvida pela sessão). */
export const POST = handle(async (req: Request) => {
  const body = await readJson<{ provider: ProviderConfig }>(req);
  const merged = mergeIncoming(loadSettings(req), { providers: [body.provider] });
  const p = merged.providers[0];
  return Response.json({ models: describeModels(await listModels(p), p.baseUrl) });
});
