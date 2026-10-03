"use client";

import Link from "next/link";
import { ellipsify } from "../../lib/explorer";
import { useWallet } from "../../lib/wallet/context";
import { DEMO_AUDITORS, DEMO_BUYERS } from "./counterparties";
import { RegisterBatchForm } from "./register-batch-form";

export type ProducerInfo = {
  name: string;
  walletAddress: string;
  originId: string;
  originName: string;
};

export function NewBatchClient({ producer }: { producer: ProducerInfo }) {
  const { wallet } = useWallet();

  if (!wallet) {
    return (
      <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted">
          Conectá la wallet verificada de tu empresa (
          <span className="font-mono">
            {ellipsify(producer.walletAddress, 4)}
          </span>
          ) para registrar un lote.
        </p>
        <Link href="/account" className="btn-secondary mt-4 inline-block">
          Conectar desde mi cuenta
        </Link>
      </div>
    );
  }

  if (wallet.account.address !== producer.walletAddress) {
    return (
      <div className="mt-8 rounded-2xl border border-amber-300 bg-amber-50/60 p-8 text-center dark:border-amber-800 dark:bg-amber-950/40">
        <p className="text-sm text-amber-900 dark:text-amber-200">
          La wallet conectada (
          <span className="font-mono">
            {ellipsify(wallet.account.address, 4)}
          </span>
          ) no es la wallet verificada de {producer.name}. Conectá{" "}
          <span className="font-mono">
            {ellipsify(producer.walletAddress, 4)}
          </span>{" "}
          para firmar como productora.
        </p>
        <Link href="/account" className="btn-secondary mt-4 inline-block">
          Cambiar desde mi cuenta
        </Link>
      </div>
    );
  }

  return (
    <RegisterBatchForm
      producer={producer}
      auditors={DEMO_AUDITORS}
      buyers={DEMO_BUYERS}
    />
  );
}
