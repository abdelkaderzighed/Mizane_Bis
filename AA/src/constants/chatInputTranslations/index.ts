import { useEffect, useState } from 'react';
import type frTranslations from './fr';

export type ChatInputTranslation = typeof frTranslations;
export type ChatInputLanguage = 'fr' | 'en' | 'ar';

const loaders: Record<ChatInputLanguage, () => Promise<{ default: ChatInputTranslation }>> = {
  fr: () => import('./fr'),
  en: () => import('./en'),
  ar: () => import('./ar')
};

const cache: Partial<Record<ChatInputLanguage, ChatInputTranslation>> = {};

export async function loadChatInputTranslations(language: ChatInputLanguage) {
  if (cache[language]) {
    return cache[language]!;
  }

  const module = await loaders[language]();
  cache[language] = module.default;
  return module.default;
}

export function getCachedChatInputTranslations(language: ChatInputLanguage) {
  return cache[language] ?? null;
}

export function useChatInputTranslations(language: ChatInputLanguage) {
  const [translations, setTranslations] = useState<ChatInputTranslation | null>(
    () => getCachedChatInputTranslations(language)
  );

  useEffect(() => {
    let isMounted = true;

    if (cache[language]) {
      setTranslations(cache[language]!);
      return () => {
        isMounted = false;
      };
    }

    loadChatInputTranslations(language)
      .then(result => {
        if (isMounted) {
          setTranslations(result);
        }
      })
      .catch(error => {
        console.error('Error loading chat input translations for', language, error);
        if (language !== 'fr') {
          loadChatInputTranslations('fr')
            .then(result => {
              if (isMounted) {
                setTranslations(result);
              }
            })
            .catch(fallbackError => {
              console.error('Error loading fallback chat input translations', fallbackError);
            });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [language]);

  return translations;
}
