import type { CompanyType } from "../lib/company";

/** Overview-page primary action targets; the labels live in the account
 *  dictionary (`dict.shell.nextStep`). */
export const NEXT_STEPS: Record<CompanyType, { href: string }> = {
  producer: { href: "/account/lotes/new" },
  buyer: { href: "/account/catalogo" },
};
