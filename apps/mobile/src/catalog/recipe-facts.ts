export type FactBasis = 'SOURCE' | 'ESTIMATE' | 'EDITORIAL' | 'UNKNOWN';
export type FactKey = 'prepTimeMinutes' | 'cookTimeMinutes' | 'additionalTimeMinutes' | 'totalTimeMinutes' | 'servings' | 'difficulty';
export type FactSources = Partial<Record<FactKey, FactBasis>>;
export function readFactSources(value: unknown): FactSources {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: FactSources = {};
  for (const key of ['prepTimeMinutes', 'cookTimeMinutes', 'additionalTimeMinutes', 'totalTimeMinutes', 'servings', 'difficulty'] as const) {
    const basis = (value as Record<string, unknown>)[key];
    if (basis === 'SOURCE' || basis === 'ESTIMATE' || basis === 'EDITORIAL' || basis === 'UNKNOWN') result[key] = basis;
  }
  return result;
}
export function qualifyFact(text: string, basis?: FactBasis): string {
  return basis === 'ESTIMATE' ? `≈ ${text}` : text;
}
