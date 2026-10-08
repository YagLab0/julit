"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { originName } from "../lib/origins";
import type { Locale } from "../lib/locale";
import { AccountSidebar, SignOutButton } from "./account-sidebar";
import { JuLitMark } from "../components/julit-logo";
import { NEXT_STEPS } from "./next-steps";
import { AccountI18nProvider, useAccountDict } from "./i18n/context";
import type { AccountDict } from "./i18n";
import { LocaleSwitch } from "./i18n/locale-switch";
import type { AccountCompany } from "./account-client";

const SECTION_PATHS: Record<string, keyof AccountDict["shell"]["sections"]> = {
  "/account": "summary",
  "/account/contratos": "contracts",
  "/account/ofertas": "offers",
  "/account/lotes": "lots",
  "/account/lotes/new": "newLot",
  "/account/catalogo": "catalog",
};

export function AccountShell({
  company,
  email,
  dict,
  locale,
  children,
}: {
  company: AccountCompany;
  email: string;
  dict: AccountDict;
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <AccountI18nProvider dict={dict}>
      <Shell company={company} email={email} locale={locale}>
        {children}
      </Shell>
    </AccountI18nProvider>
  );
}

function Shell({
  company,
  email,
  locale,
  children,
}: {
  company: AccountCompany;
  email: string;
  locale: Locale;
  children: ReactNode;
}) {
  const dict = useAccountDict();
  const pathname = usePathname();
  const sectionKey = SECTION_PATHS[pathname];
  const section = sectionKey
    ? dict.shell.sections[sectionKey]
    : dict.shell.sections.summary;
  const nextStep = NEXT_STEPS[company.companyType];
  // The embedded catalogue is a map surface: no header, full width.
  const isMap = pathname === "/account/catalogo";

  // The primary action only lives on the overview page.
  const action = pathname === "/account" && nextStep.href && (
    <Link
      href={nextStep.href}
      className="rounded-full bg-foreground px-4 py-2.5 text-xs font-semibold text-background transition hover:opacity-90 active:scale-[0.97]"
    >
      + {dict.shell.nextStep[company.companyType]}
    </Link>
  );

  return (
    <div className="flex min-h-screen">
      <AccountSidebar
        companyName={company.name}
        companyType={company.companyType}
        email={email}
        locale={locale}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <JuLitMark className="size-6 shrink-0" />
            <span className="text-sm font-bold tracking-tight text-foreground">
              JuLit
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {action}
            <LocaleSwitch locale={locale} />
            <SignOutButton className="cursor-pointer rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted" />
          </div>
        </div>

        <div
          className={
            isMap
              ? "flex min-h-0 flex-1 flex-col p-4"
              : "mx-auto w-full max-w-5xl px-4 pb-16 md:px-8"
          }
        >
          {!isMap && (
            <header className="pt-6 md:pt-8">
              <p className="text-xs text-muted">
                {dict.shell.breadcrumbRoot} <span className="mx-1">/</span>{" "}
                {section}
              </p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
                <div className="min-w-0">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {company.name}
                  </h1>
                  <p className="mt-1 text-xs text-muted">
                    {dict.roles[company.companyType]}
                    {company.companyType === "producer" && company.originId
                      ? ` · ${dict.shell.originLabel}: ${originName(company.originId)}`
                      : ` · ${dict.shell.settlementNote}`}
                  </p>
                </div>

                <div className="hidden md:block">{action}</div>
              </div>
            </header>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
