import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  startDomAutoTranslator,
  stopDomAutoTranslatorAndRestore,
} from './domAutoTranslator';

export type AppLanguage = 'id' | 'en';

export const LANGUAGE_STORAGE_KEY = 'utamago_lang_v1';

interface LanguageContextValue {
  lang: AppLanguage;
  setLang: (next: AppLanguage) => void;
  toggleLang: () => void;
  t: (idText: string, enText: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'id',
  setLang: () => {},
  toggleLang: () => {},
  t: (idText) => idText,
});

export function readStoredLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'id';
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'id') return saved;
  } catch {
    // Ignore storage access errors
  }
  return 'id';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AppLanguage>(() => readStoredLanguage());

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.title =
        lang === 'en'
          ? 'UtamaGo! — JLPT N5–N1 Japanese Study Platform'
          : 'UtamaGo! — Platform Belajar Bahasa Jepang JLPT N5–N1';
    }
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Ignore storage write errors
    }

    if (lang === 'en') {
      startDomAutoTranslator();
    } else {
      stopDomAutoTranslatorAndRestore();
    }
  }, [lang]);

  const setLang = useCallback((next: AppLanguage) => {
    setLangState(next);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === 'id' ? 'en' : 'id'));
  }, []);

  const t = useCallback(
    (idText: string, enText: string) => (lang === 'en' ? enText : idText),
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t }),
    [lang, setLang, toggleLang, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
