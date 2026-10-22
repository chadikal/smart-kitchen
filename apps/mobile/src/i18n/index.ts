import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar.json';
import en from './locales/en.json';
import { resolveLanguage } from './languages';

const deviceLanguage = resolveLanguage(getLocales().at(0)?.languageCode);

// i18next's documented setup calls use() on the default export.
// eslint-disable-next-line import/no-named-as-default-member
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: deviceLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
