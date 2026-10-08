"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AccountDict } from "./index";
import { es } from "./es";

const AccountI18nContext = createContext<AccountDict | null>(null);

export function AccountI18nProvider({
  dict,
  children,
}: {
  dict: AccountDict;
  children: ReactNode;
}) {
  return (
    <AccountI18nContext.Provider value={dict}>
      {children}
    </AccountI18nContext.Provider>
  );
}

/** Account dictionary for client components. Falls back to Spanish if rendered
 *  outside the provider (e.g. in standalone tests). */
export function useAccountDict(): AccountDict {
  const dict = useContext(AccountI18nContext);
  return dict ?? es;
}
