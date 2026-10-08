/** User-facing locales: `/` ships in Spanish, `/en` in English. The
 *  authenticated account surface keeps the same URLs and reads the cookie
 *  instead — the landing language switch writes it so the choice carries
 *  into the app. */
export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "julit_locale";

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** Client-side locale setter: persists the choice for one year. */
export function writeLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
