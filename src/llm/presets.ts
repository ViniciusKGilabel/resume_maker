import type { ProviderKind } from "./types";

/** free: sem custo; free-limited: grátis com limite diário/por minuto; paid: cobra por token. */
export type Tier = "free" | "free-limited" | "paid";

export interface Preset {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  model: string;
  notes: string;
  tier: Tier;
  /** Uma linha curta para o card do seletor. */
  description: string;
}

export const PRESETS: Preset[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    kind: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    notes: "Chave em openrouter.ai/keys. Use 'Carregar modelos' para ver os :free disponíveis.",
    tier: "free-limited",
    description: "Vários modelos numa chave só. Os terminados em :free são gratuitos.",
  },
  {
    id: "groq",
    name: "Groq",
    kind: "openai-compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    notes: "Chave em console.groq.com. Rápido e gratuito com limite diário.",
    tier: "free-limited",
    description: "Muito rápido. Gratuito com limite diário de uso.",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    kind: "openai-compatible",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
    notes: "Chave em aistudio.google.com. Endpoint compatível com OpenAI.",
    tier: "free-limited",
    description: "Modelos do Google. Gratuito com limite; os maiores podem ser pagos.",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    kind: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    notes: "Pago, barato. Chave em platform.deepseek.com.",
    tier: "paid",
    description: "Pago, mas barato. Boa qualidade de texto.",
  },
  {
    id: "ollama",
    name: "Ollama (local)",
    kind: "openai-compatible",
    baseUrl: "http://host.docker.internal:11434/v1",
    model: "llama3.2",
    notes: "Sem chave. Dentro do Docker use host.docker.internal; fora, localhost.",
    tier: "free",
    description: "Roda no seu computador. Grátis e sem enviar dados para fora.",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    kind: "anthropic",
    baseUrl: "https://api.anthropic.com",
    model: "claude-sonnet-5",
    notes: "Pago. Chave em console.anthropic.com. Troque o modelo por claude-opus-5 se quiser mais qualidade.",
    tier: "paid",
    description: "Claude. Pago; ótima escrita e revisão de texto.",
  },
];
