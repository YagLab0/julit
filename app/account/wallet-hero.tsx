"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCluster } from "../components/cluster-context";
import { getExplorerUrl } from "../lib/explorer";
import { useAccountDict } from "./i18n/context";
import { t } from "./i18n";

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
  const dict = useAccountDict();
  const router = useRouter();
  const [unlinking, setUnlinking] = useState(false);

  const clusterLabel =
    cluster === "localnet"
      ? dict.walletHero.localnet
      : t(dict.walletHero.clusterFallback, {
          cluster: `${cluster[0].toUpperCase()}${cluster.slice(1)}`,
        });

  async function unlinkWallet() {
    setUnlinking(true);
    try {
      const res = await fetch("/api/companies/wallet", { method: "DELETE" });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(payload?.error ?? dict.walletHero.unlinkError);
        return;
      }
      toast.success(dict.walletHero.unlinked);
      router.refresh();
    } catch {
      toast.error(dict.walletHero.unlinkError);
    } finally {
      setUnlinking(false);
    }
  }

  return (
    <section
      className={`flex flex-col rounded-3xl bg-primary p-6 text-primary-foreground ${className ?? ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-primary-foreground/15 px-3 py-1 text-[11px] font-semibold">
          {walletVerifiedAt
            ? dict.walletHero.verified
            : dict.walletHero.registered}
        </span>
        <a
          href={getExplorerUrl(`/address/${walletAddress}`, cluster)}
          target="_blank"
          rel="noreferrer"
          aria-label={dict.walletHero.explorerAria}
          className="grid size-8 place-items-center rounded-full bg-primary-foreground/15 transition hover:bg-primary-foreground/25"
        >
          ↗
        </a>
      </div>

      <p className="mt-8 text-2xl font-bold tracking-tight">
        {walletVerifiedAt
          ? dict.walletHero.verifiedLine
          : dict.walletHero.registeredLine}
      </p>
      <p className="mt-2 break-all font-mono text-xs opacity-70">
        {walletAddress}
      </p>

      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-primary-foreground/15 pt-4 text-[11px]">
        <div>
          <p className="opacity-70">{dict.walletHero.network}</p>
          <p className="mt-0.5 font-semibold">{clusterLabel}</p>
        </div>
        <div>
          <p className="opacity-70">{dict.walletHero.since}</p>
          <p className="mt-0.5 font-semibold">
            {walletVerifiedAt
              ? new Date(walletVerifiedAt).toLocaleDateString(dict.numLocale, {
                  day: "numeric",
                  month: "short",
                })
              : "—"}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void unlinkWallet()}
        disabled={unlinking}
        className="mt-3 cursor-pointer self-end text-[11px] font-medium text-primary-foreground/60 underline-offset-2 transition hover:text-primary-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
      >
        {unlinking ? dict.walletHero.unlinking : dict.walletHero.unlink}
      </button>
    </section>
  );
}
