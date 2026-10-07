"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { COMPANY_TYPE_LABELS } from "../lib/company";
import { originName } from "../lib/origins";
import { AccountSidebar, SignOutButton } from "./account-sidebar";
import { JuLitMark } from "../components/julit-logo";
import { NEXT_STEPS } from "./next-steps";
import type { AccountCompany } from "./account-client";

const SECTION_LABELS: Record<string, string> = {
  "/account": "Resumen",
  "/account/contratos": "Contratos comerciales",
  "/account/ofertas": "Ofertas de compras",
  "/account/lotes": "Lotes",
  "/account/lotes/new": "Registrar lote",
  "/account/catalogo": "Catálogo",
};

export function AccountShell({
  company,
  email,
  children,
}: {
  company: AccountCompany;
  email: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const section = SECTION_LABELS[pathname] ?? "Resumen";
  const nextStep = NEXT_STEPS[company.companyType];
  // The embedded catalogue is a map surface: no header, full width.
  const isMap = pathname === "/account/catalogo";

  // The primary action only lives on the overview page.
  const action = pathname === "/account" && nextStep.href && (
    <Link
      href={nextStep.href}
      className="rounded-full bg-foreground px-4 py-2.5 text-xs font-semibold text-background transition hover:opacity-90 active:scale-[0.97]"
    >
      + {nextStep.linkLabel}
    </Link>
  );

  return (
    <div className="flex min-h-screen">
      <AccountSidebar
        companyName={company.name}
        companyType={company.companyType}
        email={email}
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
                Cuenta <span className="mx-1">/</span> {section}
              </p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
                <div className="min-w-0">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {company.name}
                  </h1>
                  <p className="mt-1 text-xs text-muted">
                    {COMPANY_TYPE_LABELS[company.companyType]}
                    {company.companyType === "producer" && company.originId
                      ? ` · Origen: ${originName(company.originId)}`
                      : " · Liquidación vía escrow DvP en Devnet"}
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
