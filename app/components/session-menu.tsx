"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { COMPANY_TYPE_LABELS, isCompanyType } from "../lib/company";
import { createClient } from "../lib/supabase/client";

type SessionState =
  | { status: "loading" }
  | { status: "anonymous" }
  | {
      status: "authenticated";
      email: string | null;
      companyName: string | null;
      companyTypeLabel: string | null;
    };

export function SessionMenu() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;
      if (!user) {
        setState({ status: "anonymous" });
        return;
      }

      const { data: company } = await supabase
        .from("companies")
        .select("name, company_type")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;
      setState({
        status: "authenticated",
        email: user.email ?? null,
        companyName: company?.name ?? null,
        companyTypeLabel: isCompanyType(company?.company_type)
          ? COMPANY_TYPE_LABELS[company.company_type]
          : null,
      });
    }

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        void load();
        router.refresh();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  if (state.status === "loading") {
    return null;
  }

  if (state.status === "anonymous") {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/sign-in"
          className="inline-flex min-h-10 shrink-0 items-center rounded-lg border border-border-low px-3 py-1.5 text-xs font-medium whitespace-nowrap text-foreground/80 transition hover:bg-accent lg:min-h-0"
        >
          Ingresar
        </Link>
        {/* Sign-up removed: accounts are provisioned, not self-registered.
        <Link
          href="/sign-up"
          className="inline-flex min-h-10 shrink-0 items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-primary-foreground transition hover:opacity-90 lg:min-h-0"
        >
          Crear cuenta
        </Link>
        */}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link
        href="/account"
        title={state.companyName ?? state.email ?? "Mi cuenta"}
        className="flex max-w-44 min-w-0 flex-col rounded-lg border border-border-low px-3 py-1.5 transition hover:bg-accent sm:max-w-64"
      >
        <span className="truncate text-xs font-semibold leading-tight text-foreground">
          {state.companyName ?? state.email ?? "Mi cuenta"}
        </span>
        <span className="truncate text-[10px] leading-tight text-muted">
          {state.companyTypeLabel ?? "Completá tu empresa"}
        </span>
      </Link>
      <button
        type="button"
        onClick={() => void supabase.auth.signOut()}
        className="inline-flex min-h-10 shrink-0 items-center rounded-lg border border-border-low px-3 py-1.5 text-xs font-medium whitespace-nowrap text-foreground/80 transition hover:bg-accent lg:min-h-0"
      >
        Salir
      </button>
    </div>
  );
}
