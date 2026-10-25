import { useFonts } from 'expo-font';
import type { AppLanguage } from '@/src/i18n/languages';

export const fontFamilies = {
  loraMedium: 'LoraMedium',
  loraSemiBold: 'LoraSemiBold',
  interRegular: 'InterRegular',
  interSemiBold: 'InterSemiBold',
  interBold: 'InterBold',
  naskhMedium: 'NotoNaskhMedium',
  naskhSemiBold: 'NotoNaskhSemiBold',
  sansRegular: 'NotoSansArabicRegular',
  sansSemiBold: 'NotoSansArabicSemiBold',
  sansBold: 'NotoSansArabicBold',
} as const;

export function useAppFonts(): [boolean, Error | null] {
  return useFonts({
    [fontFamilies.loraMedium]: require('../assets/fonts/lora-500.ttf'),
    [fontFamilies.loraSemiBold]: require('../assets/fonts/lora-600.ttf'),
    [fontFamilies.interRegular]: require('../assets/fonts/inter-400.ttf'),
    [fontFamilies.interSemiBold]: require('../assets/fonts/inter-600.ttf'),
    [fontFamilies.interBold]: require('../assets/fonts/inter-700.ttf'),
    [fontFamilies.naskhMedium]: require('../assets/fonts/naskh-500.ttf'),
    [fontFamilies.naskhSemiBold]: require('../assets/fonts/naskh-600.ttf'),
    [fontFamilies.sansRegular]: require('../assets/fonts/sans-400.ttf'),
    [fontFamilies.sansSemiBold]: require('../assets/fonts/sans-600.ttf'),
    [fontFamilies.sansBold]: require('../assets/fonts/sans-700.ttf'),
  });
}

export type TextRole =
  | 'display'
  | 'section'
  | 'featuredTitle'
  | 'compactTitle'
  | 'body'
  | 'meta'
  | 'eyebrow'
  | 'wordmark';

export function fontFamilyFor(language: AppLanguage, role: TextRole): string {
  const arabic = language === 'ar';
  if (role === 'wordmark') return fontFamilies.loraSemiBold;
  if (role === 'display' || role === 'section' || role === 'featuredTitle') {
    return arabic ? fontFamilies.naskhMedium : fontFamilies.loraMedium;
  }
  if (role === 'compactTitle') {
    return arabic ? fontFamilies.sansSemiBold : fontFamilies.interSemiBold;
  }
  if (role === 'eyebrow') {
    return arabic ? fontFamilies.sansBold : fontFamilies.interBold;
  }
  if (role === 'meta') {
    return arabic ? fontFamilies.sansRegular : fontFamilies.interRegular;
  }
  return arabic ? fontFamilies.sansRegular : fontFamilies.interRegular;
}
