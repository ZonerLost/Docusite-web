import { useUser } from '@/contexts/UserContext';
import enTranslations from '@/translations/en.json';
import deTranslations from '@/translations/de.json';
import arTranslations from '@/translations/ar.json';
import zhTranslations from '@/translations/zh.json';
import frTranslations from '@/translations/fr.json';
import nlTranslations from '@/translations/nl.json';

const translations = {
  en: enTranslations,
  de: deTranslations,
  ar: arTranslations,
  zh: zhTranslations,
  fr: frTranslations,
  nl: nlTranslations
};

export const useTranslation = () => {
  const { language } = useUser();
  
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language as keyof typeof translations] || translations.en;
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };
  
  return { t, language };
};
