import type { LanguageCode } from '../types';

const cache: Partial<Record<LanguageCode, any>> = {};

async function importTranslations(language: LanguageCode) {
  switch (language) {
    case 'en':
      return (await import('./en')).default;
    case 'ar':
      return (await import('./ar')).default;
    case 'fr':
    default:
      return (await import('./fr')).default;
  }
}

export async function loadTranslations(language: LanguageCode) {
  if (cache[language]) {
    return cache[language]!;
  }

  const translations = await importTranslations(language);
  cache[language] = translations;
  return translations;
}

export function getCachedTranslations(language: LanguageCode) {
  return cache[language] ?? null;
}
