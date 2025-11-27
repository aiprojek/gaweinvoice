import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { translations, Language } from '../utils/translations';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLang = localStorage.getItem('language');
    // Set default language to user's browser language if supported, otherwise 'en'
    if (savedLang && (savedLang === 'id' || savedLang === 'en')) {
      return savedLang;
    }
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'id' ? 'id' : 'en';
  });

  const setLanguage = (lang: Language) => {
    localStorage.setItem('language', lang);
    setLanguageState(lang);
  };

  const t = useCallback((key: string, values?: Record<string, string | number>): string => {
    let translation = translations[language][key] || translations['en'][key] || key;

    if (values) {
      Object.entries(values).forEach(([k, v]) => {
        const regex = new RegExp(`{${k}}`, 'g');
        translation = translation.replace(regex, String(v));
      });
    }
    return translation;
  }, [language]);


  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
