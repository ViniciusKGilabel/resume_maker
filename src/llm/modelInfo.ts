import { PRESETS, type Tier } from "./presets";
import type { ModelInfo } from "./types";

export interface DescribedModel {
  id: string;
  /** unknown: base URL própria, não sabemos se cobra. */
  tier: Tier | "unknown";
  description?: string;
}

/**
 * Dica curta a partir do nome, sem depender do id exato: modelos novos (ex.: gemini-3.x)
 * continuam recebendo uma descrição sem precisar atualizar o código.
 */
const HINTS: [RegExp, string][] = [
  [/(^|[-_/])(lite|nano|mini|tiny|small|haiku|instant|8b|3b|1b)([-_.:]|$)/i, "Rápido e econômico; bom para textos curtos."],
  [/(^|[-_/])(flash|turbo|fast)([-_.:]|$)/i, "Rápido, com boa qualidade para o dia a dia."],
  [/(^|[-_/])(opus|pro|ultra|large|70b|405b|235b|reasoner|r1)([-_.:]|$)/i, "Mais qualidade de escrita; mais lento e, se pago, mais caro."],
  [/(^|[-_/])(sonnet|medium|chat|versatile|32b)([-_.:]|$)/i, "Equilíbrio entre qualidade e velocidade."],
  [/(embed|whisper|tts|audio|image|vision-only|guard|moderation)/i, "Não serve para texto de currículo."],
];

export function modelHint(id: string): string | undefined {
  return HINTS.find(([re]) => re.test(id))?.[1];
}

const RANK: Record<DescribedModel["tier"], number> = { free: 0, "free-limited": 0, paid: 1, unknown: 2 };

/** Junta o que a API informou com o nível do preset e a dica pelo nome. Grátis primeiro. */
export function describeModels(models: ModelInfo[], baseUrl: string): DescribedModel[] {
  const preset = PRESETS.find((p) => p.baseUrl === baseUrl);
  return models
    .map((m): DescribedModel => ({
      id: m.id,
      tier: m.free === true ? "free" : m.free === false ? "paid" : (preset?.tier ?? "unknown"),
      description: m.description || modelHint(m.id),
    }))
    .sort((a, b) => RANK[a.tier] - RANK[b.tier] || a.id.localeCompare(b.id));
}
