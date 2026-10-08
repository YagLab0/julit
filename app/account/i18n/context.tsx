"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AccountDict } from "./index";

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

/** Account dictionary for client components; the account layout always
 *  renders the provider, so a missing value is a wiring bug. */
export function useAccountDict(): AccountDict {
  const dict = useContext(AccountI18nContext);
  if (!dict) {
    throw new Error("useAccountDict must be used within AccountI18nProvider");
  }
  return dict;
}
