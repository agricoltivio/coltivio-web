import type { TFunction } from 'i18next'
import { dataSourcesUrl } from './links'

/**
 * Attribution HTML for the map sources. MapLibre's AttributionControl collects these from
 * the sources and renders them. The full per-canton attribution lives on the landing page.
 */
export function mapAttribution(t: TFunction, language: string) {
  return {
    swisstopo: '<a href="https://www.swisstopo.admin.ch" target="_blank" rel="noopener">© swisstopo</a>',
    cantons: `<a href="${dataSourcesUrl(language)}" target="_blank" rel="noopener">${t('map.attributionCantons')}</a>`,
  }
}
