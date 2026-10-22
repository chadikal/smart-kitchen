import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { I18nManager } from 'react-native';
import i18n from '@/src/i18n';
import {
  directionFor,
  resolveLanguage,
  type AppLanguage,
  type LayoutDirection,
} from '@/src/i18n/languages';

I18nManager.allowRTL(true);

type LanguageContextValue = {
  language: AppLanguage;
  direction: LayoutDirection;
  setLanguage: (language: AppLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() =>
    resolveLanguage(i18n.language),
  );

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    void i18n.changeLanguage(nextLanguage);
    setLanguageState(nextLanguage);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      direction: directionFor(language),
      setLanguage,
    }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useAppLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error('useAppLanguage must be used within LanguageProvider');
  }
  return value;
}
