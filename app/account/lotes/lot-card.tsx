"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ellipsify } from "../../lib/explorer";
import { originName } from "../../lib/origins";
import type { LotStatus } from "../../explorer/data/lots";
import {
  StatusBadge,
  bagCount,
  decimalFmt,
  integerFmt,
} from "../../explorer/components/lot-display";
import type { ProducerLot } from "../account-data";

// R3F touches WebGL: client-only, never prerendered.
const LotModel = dynamic(
  () => import("../../explorer/components/lot-model").then((m) => m.LotModel),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full animate-pulse place-items-center text-xs text-muted">
        Cargando 3D…
      </div>
    ),
  }
);

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary px-3 py-2">
      <p className="text-[10px] font-medium tracking-wide text-muted uppercase">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-xs font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

/** Producer lot tile: 3D pallet on top (same model as the explorer mine
 *  detail), headline price, purity bar and quick stats below. */
export function LotGridCard({
  lot,
  index,
}: {
  lot: ProducerLot;
  index: number;
}) {
  const purity = Math.min(100, Math.max(0, lot.purity_pct));

  return (
    <Link
      href={`/batch/${lot.pda_address}`}
      style={{ "--bento-i": index } as CSSProperties}
      className="animate-bento-in block rounded-3xl bg-card p-2.5 transition-transform active:scale-[0.99]"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-b from-secondary via-background to-secondary">
        <LotModel lotId={lot.lot_id} volumeTonnes={lot.volume_tonnes} />
        <div className="pointer-events-none absolute top-3 left-3">
          <StatusBadge status={lot.status as LotStatus} />
        </div>
        <span className="pointer-events-none absolute right-3 bottom-2.5 hidden text-[10px] text-muted sm:inline">
          Arrastrá para rotar
        </span>
      </div>

      <div className="px-2 pt-3.5 pb-1.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-mono text-sm font-bold">
              {lot.lot_id}
            </h3>
            <p className="mt-0.5 truncate text-[11px] text-muted">
              {originName(lot.origin_id) ?? lot.origin_id}
            </p>
          </div>
          <p className="shrink-0 text-right">
            <span className="text-xl font-bold tracking-tight">
              {integerFmt.format(lot.price_usdc)}
            </span>
            <span className="ml-1 text-[11px] text-muted">USDC/t</span>
          </p>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-foreground"
            style={{ width: `${purity}%` }}
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <MiniStat
            label="Volumen"
            value={`${integerFmt.format(lot.volume_tonnes)} t`}
          />
          <MiniStat
            label="Big bags"
            value={integerFmt.format(bagCount(lot.volume_tonnes))}
          />
          <MiniStat label="Pureza" value={`${decimalFmt.format(purity)}%`} />
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border-low pt-2.5 text-[11px]">
          <span className="truncate text-muted">
            Comprador {ellipsify(lot.buyer_wallet, 4)}
          </span>
          <span className="shrink-0 font-semibold text-brand-700 dark:text-brand-400">
            Detalle →
          </span>
        </div>
      </div>
    </Link>
  );
}
