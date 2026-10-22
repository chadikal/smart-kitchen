export const supportedLanguages = ['en', 'ar'] as const;

export type AppLanguage = (typeof supportedLanguages)[number];
export type LayoutDirection = 'ltr' | 'rtl';

export function resolveLanguage(
  languageCode: string | null | undefined,
): AppLanguage {
  const normalized = languageCode?.toLowerCase().split('-')[0];
  return normalized === 'ar' ? 'ar' : 'en';
}

export function directionFor(language: AppLanguage): LayoutDirection {
  return language === 'ar' ? 'rtl' : 'ltr';
}
