import type { Locale } from "../../lib/locale";
import { es } from "./es";
import { en } from "./en";

export type AccountDict = typeof es;

export const ACCOUNT_LOCALES: Record<Locale, AccountDict> = { es, en };

/** Expands `{name}` placeholders in a dictionary template. */
export function t(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (raw, key: string) =>
    key in vars ? String(vars[key]) : raw
  );
}
