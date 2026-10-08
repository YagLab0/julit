import { getLocale } from "../../lib/locale-server";
import { ACCOUNT_LOCALES, type AccountDict } from "./index";

/** Server-side: resolves the account dictionary from the locale cookie. */
export async function getAccountDict(): Promise<AccountDict> {
  return ACCOUNT_LOCALES[await getLocale()];
}
