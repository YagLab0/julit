import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState, WalletCard } from "../account-client";
import { getAccountContext } from "../account-data";
import { LotGridCard } from "./lot-card";

export default async function LotesPage() {
  const { company, producerLots } = await getAccountContext();

  // Layout renders the onboarding form when there is no company yet.
  if (!company) return null;

  if (company.companyType !== "producer") {
    redirect("/account");
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Lotes registrados</h2>
          <p className="mt-0.5 text-xs text-muted">
            {producerLots.length} {producerLots.length === 1 ? "lote" : "lotes"}{" "}
            en Solana Devnet.
          </p>
        </div>
        <Link
          href="/account/lotes/new"
          className="rounded-full bg-foreground px-4 py-2.5 text-xs font-semibold text-background transition hover:opacity-90 active:scale-[0.97]"
        >
          + Registrar lote
        </Link>
      </div>

      {!company.walletAddress ? (
        <WalletCard
          className="animate-bento-in mt-4"
          walletAddress={company.walletAddress}
          walletVerifiedAt={company.walletVerifiedAt}
        />
      ) : producerLots.length === 0 ? (
        <div className="animate-bento-in mt-4 rounded-3xl bg-card">
          <EmptyState
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="size-9"
              >
                <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
                <path d="M3 8l9 5 9-5M12 13v8" />
              </svg>
            }
            title="Todavía no registraste lotes"
            body="Dá de alta un lote de carbonato de litio grado batería con su certificado de planta y comprador designado."
            action={
              <Link
                href="/account/lotes/new"
                className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:opacity-90"
              >
                Registrar lote
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {producerLots.map((lot, i) => (
            <LotGridCard key={lot.pda_address} lot={lot} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
