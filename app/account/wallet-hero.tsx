"use client";

import { address } from "@solana/kit";
import { useCluster } from "../components/cluster-context";
import { useBalance } from "../lib/hooks/use-balance";
import { lamportsToSolString } from "../lib/lamports";
import { ellipsify, getExplorerUrl } from "../lib/explorer";

export function WalletHero({
  walletAddress,
  walletVerifiedAt,
  className,
}: {
  walletAddress: string;
  walletVerifiedAt: string | null;
  className?: string;
}) {
  const { cluster } = useCluster();
  const balance = useBalance(address(walletAddress));

  const clusterLabel =
    cluster === "localnet"
      ? "Localnet"
      : `Solana ${cluster[0].toUpperCase()}${cluster.slice(1)}`;

  return (
    <section
      className={`flex flex-col rounded-3xl bg-primary p-6 text-primary-foreground ${className ?? ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-primary-foreground/15 px-3 py-1 text-[11px] font-semibold">
          {walletVerifiedAt ? "Wallet verificada" : "Wallet registrada"}
        </span>
        <a
          href={getExplorerUrl(`/address/${walletAddress}`, cluster)}
          target="_blank"
          rel="noreferrer"
          aria-label="Ver la wallet en el Explorer"
          className="grid size-8 place-items-center rounded-full bg-primary-foreground/15 transition hover:bg-primary-foreground/25"
        >
          ↗
        </a>
      </div>

      <p className="mt-8 font-mono text-5xl font-bold tabular-nums tracking-tight">
        {balance.lamports != null ? lamportsToSolString(balance.lamports) : "—"}
        <span className="ml-2 text-xl font-semibold opacity-70">SOL</span>
      </p>
      <p className="mt-2 font-mono text-xs opacity-70">
        {ellipsify(walletAddress, 8)}
      </p>

      <div className="mt-auto grid grid-cols-3 gap-3 border-t border-primary-foreground/15 pt-4 text-[11px]">
        <div>
          <p className="opacity-70">Red</p>
          <p className="mt-0.5 font-semibold">{clusterLabel}</p>
        </div>
        <div>
          <p className="opacity-70">Estado</p>
          <p className="mt-0.5 font-semibold">
            {walletVerifiedAt ? "Verificada" : "Registrada"}
          </p>
        </div>
        <div>
          <p className="opacity-70">Desde</p>
          <p className="mt-0.5 font-semibold">
            {walletVerifiedAt
              ? new Date(walletVerifiedAt).toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "short",
                })
              : "—"}
          </p>
        </div>
      </div>
    </section>
  );
}
