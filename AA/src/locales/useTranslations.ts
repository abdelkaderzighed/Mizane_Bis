import { useEffect, useState } from 'react';
import type { LanguageCode } from '../types';
import { loadTranslations, getCachedTranslations } from './loadTranslations';

export function useTranslations(language: LanguageCode) {
  const [translations, setTranslations] = useState<any | null>(
    () => getCachedTranslations(language)
  );

  useEffect(() => {
    let isMounted = true;

    const cached = getCachedTranslations(language);
    if (cached) {
      setTranslations(cached);
      return () => {
        isMounted = false;
      };
    }

    const resolveTranslations = async () => {
      try {
        const data = await loadTranslations(language);
        if (isMounted) {
          setTranslations(data);
        }
      } catch (error) {
        console.error('Error loading translations for', language, error);
        if (language !== 'fr') {
          try {
            const fallback = await loadTranslations('fr');
            if (isMounted) {
              setTranslations(fallback);
            }
          } catch (fallbackError) {
            console.error('Error loading fallback translations', fallbackError);
          }
        }
      }
    };

    resolveTranslations();

    return () => {
      isMounted = false;
    };
  }, [language]);

  return translations;
}
