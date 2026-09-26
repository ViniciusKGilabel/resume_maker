import type { ProviderKind } from "./types";

export interface Preset {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  model: string;
  notes: string;
  free: boolean;
}

export const PRESETS: Preset[] = [
  {
    id: "openrouter",
    name: "OpenRouter (modelos :free)",
    kind: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    notes: "Chave em openrouter.ai/keys. Use 'Carregar modelos' para ver os :free disponíveis.",
    free: true,
  },
  {
    id: "groq",
    name: "Groq (free tier)",
    kind: "openai-compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    notes: "Chave em console.groq.com. Rápido e gratuito com limite diário.",
    free: true,
  },
  {
    id: "gemini",
    name: "Google Gemini (free tier)",
    kind: "openai-compatible",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
    notes: "Chave em aistudio.google.com. Endpoint compatível com OpenAI.",
    free: true,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    kind: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    notes: "Pago, barato. Chave em platform.deepseek.com.",
    free: false,
  },
  {
    id: "ollama",
    name: "Ollama (local)",
    kind: "openai-compatible",
    baseUrl: "http://host.docker.internal:11434/v1",
    model: "llama3.2",
    notes: "Sem chave. Dentro do Docker use host.docker.internal; fora, localhost.",
    free: true,
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    kind: "anthropic",
    baseUrl: "https://api.anthropic.com",
    model: "claude-sonnet-5",
    notes: "Pago. Chave em console.anthropic.com. Troque o modelo por claude-opus-5 se quiser mais qualidade.",
    free: false,
  },
];
