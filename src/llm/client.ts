import { anthropicDriver } from "./drivers/anthropic";
import { openaiCompatibleDriver } from "./drivers/openaiCompatible";
import { extractJson } from "./json";
import { LlmError, type ChatRequest, type LlmDriver, type ProviderConfig } from "./types";

export function driverFor(p: ProviderConfig): LlmDriver {
  return p.kind === "anthropic" ? anthropicDriver : openaiCompatibleDriver;
}

/** Uma chamada, resposta parseada como JSON. */
export async function chatJson(p: ProviderConfig, req: ChatRequest): Promise<unknown> {
  const text = await driverFor(p).chat(p, req);
  try {
    return extractJson(text);
  } catch (e) {
    throw new LlmError(502, `${(e as Error).message}. Início da resposta: ${text.slice(0, 200)}`);
  }
}

export function listModels(p: ProviderConfig): Promise<string[]> {
  return driverFor(p).listModels(p);
}
