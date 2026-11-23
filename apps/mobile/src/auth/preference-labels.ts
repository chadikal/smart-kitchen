import type { CatalogOption } from '../catalog/discover.ts';

export const preferenceLabelKeys = [
  'greekInspired',
  'japaneseInspired',
  'chineseInspired',
  'greek',
  'mediterranean',
  'northAfrican',
] as const;

export type PreferenceLabelKey = (typeof preferenceLabelKeys)[number];

/** Slugs stay unchanged. Inspired cuisines get a label that is not a second "Greek". */
export function preferenceLabelKey(slug: string): PreferenceLabelKey | null {
  if (slug.endsWith('greek-inspired')) return 'greekInspired';
  if (slug.endsWith('japanese-inspired')) return 'japaneseInspired';
  if (slug.endsWith('chinese-inspired')) return 'chineseInspired';
  if (slug === 'greek' || slug.endsWith('-greek')) return 'greek';
  if (slug.endsWith('mediterranean')) return 'mediterranean';
  if (slug.endsWith('north-african')) return 'northAfrican';
  return null;
}

export function withPreferenceLabels(
  options: readonly CatalogOption[],
  labels: Record<PreferenceLabelKey, string>,
): CatalogOption[] {
  return options.map((option) => {
    const key = preferenceLabelKey(option.slug);
    if (!key) return option;
    const inspired = key.endsWith('Inspired');
    if (!inspired && !(option.language === 'ar' && option.fallbackUsed)) return option;
    return { ...option, name: labels[key] };
  });
}

export function summarizePreferenceSlugs(
  slugs: readonly string[],
  options: readonly { slug: string; name: string }[],
  empty: string,
  pending: string,
): string {
  if (slugs.length === 0) return empty;
  const bySlug = new Map(options.map((option) => [option.slug, option.name]));
  const names = slugs.flatMap((slug) => {
    const name = bySlug.get(slug);
    return name ? [name] : [];
  });
  if (names.length === 0) return pending;
  return names.join(' · ');
}
