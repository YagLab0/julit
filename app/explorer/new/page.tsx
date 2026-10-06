import Link from "next/link";
import { redirect } from "next/navigation";
import { GateCard } from "../../components/gate-card";
import { SessionMenu } from "../../components/session-menu";
import { ThemeToggle } from "../../components/theme-toggle";
import { originName } from "../../lib/origins";
import { createClient } from "../../lib/supabase/server";
import { NewLotClient } from "./new-lot-client";

export default async function NewBatchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name, company_type, wallet_address, wallet_verified_at, origin_id")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link href="/explorer" className="text-sm font-bold tracking-tight">
          JuLit
        </Link>
        <div className="flex items-center gap-3">
          <SessionMenu />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16">
        <p className="eyebrow">Panel de productora</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Registrar lote
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Dá de alta un lote de carbonato de litio grado batería en Solana
          Devnet, con comprador designado y certificado de planta. La wallet
          verificada de tu empresa firma como productora.
        </p>

        {!company ? (
          <GateCard body="Registrá tu empresa antes de dar de alta lotes." />
        ) : company.company_type !== "producer" ? (
          <GateCard body="El alta de lotes es exclusiva de empresas productoras." />
        ) : !company.wallet_verified_at ? (
          <GateCard body="Vinculá la wallet verificada de tu empresa para poder firmar lotes." />
        ) : !company.origin_id ? (
          <GateCard body="El origen de producción de tu empresa se provisiona desde el servidor. Contactá al operador de la demo." />
        ) : (
          <NewLotClient
            producer={{
              name: company.name,
              walletAddress: company.wallet_address!,
              originId: company.origin_id,
              originName: originName(company.origin_id) ?? company.origin_id,
            }}
          />
        )}
      </main>
    </div>
  );
}
