import Link from "next/link";
import { redirect } from "next/navigation";
import { GateCard } from "../../components/gate-card";
import { SessionMenu } from "../../components/session-menu";
import { ThemeToggle } from "../../components/theme-toggle";
import { createClient } from "../../lib/supabase/server";
import { loadAuditorBatch } from "../batches";
import { CertifyBatch } from "./certify-batch";

export default async function CertifyBatchPage({
  params,
}: {
  params: Promise<{ pda: string }>;
}) {
  const { pda } = await params;

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

  const batch =
    company?.company_type === "auditor" && company.wallet_verified_at
      ? await loadAuditorBatch(pda, company.wallet_address!)
      : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link href="/audit" className="text-sm font-bold tracking-tight">
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
          Certificar lote
        </h1>

        {!company ? (
          <GateCard body="Registrá tu empresa antes de certificar lotes." />
        ) : company.company_type !== "auditor" ? (
          <GateCard body="La certificación de lotes es exclusiva de empresas auditoras." />
        ) : !company.wallet_verified_at ? (
          <GateCard body="Vinculá la wallet verificada de tu empresa para poder certificar." />
        ) : (
          <CertifyBatch
            batch={batch}
            auditor={{
              name: company.name,
              walletAddress: company.wallet_address!,
            }}
          />
        )}
      </main>
    </div>
  );
}
