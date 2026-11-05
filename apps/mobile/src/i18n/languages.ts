export const supportedLanguages = ['en', 'ar'] as const;

export type AppLanguage = (typeof supportedLanguages)[number];
export type LayoutDirection = 'ltr' | 'rtl';

/** Localize display digits without parsing or rounding decimal quantities. */
export function localizeDigits(value: string | number, language: AppLanguage): string {
  const text = String(value);
  if (language !== 'ar') return text;
  return text.replace(/[0-9]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]!);
}

export function resolveLanguage(
  languageCode: string | null | undefined,
): AppLanguage {
  const normalized = languageCode?.toLowerCase().split('-')[0];
  return normalized === 'ar' ? 'ar' : 'en';
}

export function directionFor(language: AppLanguage): LayoutDirection {
  return language === 'ar' ? 'rtl' : 'ltr';
}

/**
 * `native-text` is a React Native paragraph. iOS and Android swap `left`
 * and `right` when that node's layout direction is already RTL, so the style
 * stays `left` and the platform resolves the start edge once.
 * Web and React Native text inputs keep physical `left` and `right`.
 */
export type TextAlignPlatform = 'web' | 'native-text' | 'native-input';

export function textAlignFor(
  direction: LayoutDirection,
  platform: TextAlignPlatform,
): 'left' | 'right' {
  if (platform === 'native-text') return 'left';
  return direction === 'rtl' ? 'right' : 'left';
}
