const LANDING_URL = 'https://coltivio.ch'
const LOCALIZED = ['en', 'fr', 'it']

/**
 * Privacy policy on the landing page. German lives at the root, the other languages
 * under their prefix (see coltivio-landing/src/pages/[lang]/privacy.astro).
 */
export function privacyPolicyUrl(language: string): string {
  const lang = language.slice(0, 2)
  return LOCALIZED.includes(lang) ? `${LANDING_URL}/${lang}/privacy/` : `${LANDING_URL}/privacy/`
}
