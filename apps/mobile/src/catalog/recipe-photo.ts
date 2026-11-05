export type RecipePhoto = { url: string; attribution: string; sourceUrl: string };

// Source metadata is not an arbitrary URL to open or load.
export function readRecipePhoto(value: unknown): RecipePhoto | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (typeof item.url !== 'string' || !/^https:\/\/www\.themealdb\.com\/images\/media\/meals\/[a-zA-Z0-9_-]+\.jpg$/.test(item.url)) return null;
  if (item.attribution !== 'TheMealDB' || typeof item.sourceUrl !== 'string' || !/^https:\/\/www\.themealdb\.com\/meal\/\d+$/.test(item.sourceUrl)) return null;
  return { url: item.url, attribution: item.attribution, sourceUrl: item.sourceUrl };
}
