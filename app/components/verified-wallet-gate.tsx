"use client";

import Link from "next/link";
import { ellipsify } from "../lib/explorer";
import { useWallet } from "../lib/wallet/context";

/**
 * Client gate: renders children only when the connected wallet is the
 * company's verified wallet. Otherwise explains which wallet to connect.
 * `action` describes what requires the wallet ("registrar un lote"),
 * `signAs` the signing role shown on mismatch ("productora", "compradora").
 */
export function VerifiedWalletGate({
  name,
  walletAddress,
  action,
  signAs,
  children,
}: {
  name: string;
  walletAddress: string;
  action: string;
  signAs: string;
  children: React.ReactNode;
}) {
  const { wallet } = useWallet();

  if (!wallet) {
    return (
      <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted">
          Conectá la wallet verificada de tu empresa (
          <span className="font-mono">{ellipsify(walletAddress, 4)}</span>) para{" "}
          {action}.
        </p>
        <Link href="/account" className="btn-secondary mt-4 inline-block">
          Conectar desde mi cuenta
        </Link>
      </div>
    );
  }

  if (wallet.account.address !== walletAddress) {
    return (
      <div className="mt-8 rounded-2xl border border-amber-300 bg-amber-50/60 p-8 text-center dark:border-amber-800 dark:bg-amber-950/40">
        <p className="text-sm text-amber-900 dark:text-amber-200">
          La wallet conectada (
          <span className="font-mono">
            {ellipsify(wallet.account.address, 4)}
          </span>
          ) no es la wallet verificada de {name}. Conectá{" "}
          <span className="font-mono">{ellipsify(walletAddress, 4)}</span> para{" "}
          {signAs}.
        </p>
        <Link href="/account" className="btn-secondary mt-4 inline-block">
          Cambiar desde mi cuenta
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
