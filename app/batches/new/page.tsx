"use client";

import Link from "next/link";
import { ThemeToggle } from "../../components/theme-toggle";
import { ClusterSelect } from "../../components/cluster-select";
import { WalletButton } from "../../components/wallet-button";
import { useWallet } from "../../lib/wallet/context";
import { RegisterBatchForm } from "./register-batch-form";

export default function NewBatchPage() {
  const { wallet, status } = useWallet();
  const connected = status === "connected" && wallet != null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/batches" className="text-sm font-bold tracking-tight">
          JuLit
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <ClusterSelect />
          <WalletButton />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16">
        <p className="eyebrow">Panel de productora</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Registrar lote
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Dá de alta un lote de carbonato de litio grado batería en Solana
          Devnet. La wallet conectada firma como productora.
        </p>

        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50/95 px-3 py-2 text-[11px] leading-snug text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
          <strong>Demo frontend.</strong> La verificación del rol de productora
          y la transacción on-chain llegan con la API y el programa Anchor.
        </div>

        {connected ? (
          <RegisterBatchForm producerWallet={wallet.account.address} />
        ) : (
          <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted">
              Conectá la wallet de tu empresa productora para registrar un lote.
            </p>
            <div className="mt-4 inline-block">
              <WalletButton />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
