export type ProviderKind = "openai-compatible" | "anthropic";

export interface ProviderConfig {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ChatRequest {
  system: string;
  user: string;
  maxTokens?: number;
}

export class LlmError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

/** Modelo como o provider informa; free/description só quando a API manda (ex.: OpenRouter). */
export interface ModelInfo {
  id: string;
  free?: boolean;
  description?: string;
}

export interface LlmDriver {
  /** Envia uma mensagem e retorna o texto bruto da resposta. */
  chat(provider: ProviderConfig, req: ChatRequest): Promise<string>;
  /** Lista ids de modelos disponíveis no provider (quando suportado). */
  listModels(provider: ProviderConfig): Promise<ModelInfo[]>;
}

export interface JobInput {
  company: string;
  title: string;
  description: string;
  links: string[];
  webSearch: boolean;
}
