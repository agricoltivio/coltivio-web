const LANDING_URL = 'https://coltivio.ch'
const LOCALIZED = ['en', 'fr', 'it']

/**
 * A page on the landing site. German lives at the root, the other languages
 * under their prefix (see coltivio-landing/src/pages/[lang]/).
 */
function landingUrl(page: string, language: string): string {
  const lang = language.slice(0, 2)
  return LOCALIZED.includes(lang) ? `${LANDING_URL}/${lang}/${page}/` : `${LANDING_URL}/${page}/`
}

export function privacyPolicyUrl(language: string): string {
  return landingUrl('privacy', language)
}

export function dataSourcesUrl(language: string): string {
  return landingUrl('data-sources', language)
}
