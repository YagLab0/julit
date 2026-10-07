"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type CSSProperties } from "react";
import { createClient } from "../lib/supabase/client";
import { COMPANY_TYPE_LABELS, type CompanyType } from "../lib/company";
import { JuLitMark } from "../components/julit-logo";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={busy}
      className={
        className ??
        "w-full cursor-pointer rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted transition hover:text-foreground disabled:opacity-50"
      }
    >
      {busy ? "Saliendo…" : "Salir"}
    </button>
  );
}

export function AccountSidebar({
  companyName,
  companyType,
  email,
}: {
  companyName: string;
  companyType: CompanyType;
  email: string;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: "Resumen", href: "/account" },
    { label: "Contratos comerciales", href: "/account/contratos" },
    ...(companyType === "producer"
      ? [
          { label: "Ofertas de compras", href: "/account/ofertas" },
          { label: "Lotes", href: "/account/lotes" },
        ]
      : []),
    { label: "Catálogo", href: "/account/catalogo" },
  ];

  const initials = companyName
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="hidden w-64 shrink-0 p-4 pr-0 md:block">
      <div className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col rounded-3xl bg-card p-5">
        <Link href="/" className="flex items-center gap-2.5">
          <JuLitMark className="size-7 shrink-0" />
          <span className="text-sm font-bold tracking-tight text-foreground">
            JuLit
          </span>
        </Link>

        <p className="eyebrow mt-8">Cuenta</p>
        <nav className="mt-2 space-y-1">
          {navItems.map((item, i) => {
            const active =
              pathname === item.href ||
              (item.href !== "/account" &&
                pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{ "--bento-i": i } as CSSProperties}
                className={`animate-bento-in flex items-center justify-between rounded-full px-4 py-2 text-xs transition active:scale-[0.98] ${
                  active
                    ? "bg-secondary font-semibold text-foreground"
                    : "font-medium text-muted hover:bg-secondary hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div
          style={{ "--bento-i": navItems.length + 1 } as CSSProperties}
          className="animate-bento-in mt-auto rounded-2xl bg-secondary p-3"
        >
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-bold text-background">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">
                {companyName}
              </p>
              <p className="truncate text-[10px] text-muted">
                {COMPANY_TYPE_LABELS[companyType]} · {email}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <SignOutButton />
          </div>
        </div>
      </div>
    </aside>
  );
}
