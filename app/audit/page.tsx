import Link from "next/link";
import { redirect } from "next/navigation";
import { GateCard } from "../components/gate-card";
import { SessionMenu } from "../components/session-menu";
import { ThemeToggle } from "../components/theme-toggle";
import { createClient } from "../lib/supabase/server";
import { AuditClient } from "./audit-client";
import { loadAuditorContracts } from "./contracts";

export default async function AuditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name, company_type, wallet_address, wallet_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  const contracts =
    company?.company_type === "auditor" && company.wallet_verified_at
      ? await loadAuditorContracts(user.id)
      : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link href="/batches" className="text-sm font-bold tracking-tight">
          JuLit
        </Link>
        <div className="flex items-center gap-3">
          <SessionMenu />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16">
        <p className="eyebrow">Panel de auditor</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Certificación de lotes
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Certificá los lotes que te designaron sus productoras: subí el
          certificado de auditoría y declará los hallazgos ESG y de la
          regulación europea de baterías.
        </p>

        {!company ? (
          <GateCard body="Registrá tu empresa antes de certificar lotes." />
        ) : company.company_type !== "auditor" ? (
          <GateCard body="La certificación de lotes es exclusiva de empresas auditoras." />
        ) : !company.wallet_verified_at ? (
          <GateCard body="Vinculá la wallet verificada de tu empresa para poder certificar." />
        ) : (
          <AuditClient
            auditor={{
              name: company.name,
              walletAddress: company.wallet_address!,
            }}
            contracts={contracts}
          />
        )}
      </main>
    </div>
  );
}
