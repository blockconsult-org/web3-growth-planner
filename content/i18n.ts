export type Locale = 'en' | 'de';
export const locales = ['en', 'de'] as const;
export function asLocale(value: string): Locale { return value === 'de' ? 'de' : 'en'; }
export function localeHref(locale: Locale, path: string): string {
 const localized = (locale === 'de' ? '/de' : '') + path;
 return path.startsWith('/tools/') || path === '/tokenomics-simulator' ? localized : 'https://www.blockconsult.org' + localized;
}
