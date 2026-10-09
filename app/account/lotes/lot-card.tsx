"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, type CSSProperties, type ReactNode } from "react";
import { ellipsify } from "../../lib/explorer";
import { originName } from "../../lib/origins";
import type { LotStatus } from "../../explorer/data/lots";
import { StatusBadge, bagCount } from "../../explorer/components/lot-display";
import type { ProducerLot } from "../account-data";
import type { AcquiredLot, DesignatedLot } from "../account-client";
import { useAccountDict } from "../i18n/context";
import { t } from "../i18n";

function ModelLoading() {
  const dict = useAccountDict();
  return (
    <div className="grid h-full w-full animate-pulse place-items-center text-xs text-muted">
      {dict.lotCard.loading3d}
    </div>
  );
}

// R3F touches WebGL: client-only, never prerendered.
const LotModel = dynamic(
  () => import("../../explorer/components/lot-model").then((m) => m.LotModel),
  { ssr: false, loading: ModelLoading }
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

/** Lot tile: 3D pallet on top (same model as the explorer mine
 *  detail), headline price, purity bar and quick stats below. The footer
 *  names the counterparty: the buyer for producers, the producer for buyers. */
export function LotGridCard({
  lot,
  index,
  action,
}: {
  lot: ProducerLot | DesignatedLot | AcquiredLot;
  index: number;
  /** Optional action footer (e.g. the buyer's escrow fund button). Its
   *  clicks are default-prevented inside the action so the card link
   *  does not navigate. */
  action?: ReactNode;
}) {
  const dict = useAccountDict();
  const [integerFmt, decimalFmt] = useMemo(
    () => [
      new Intl.NumberFormat(dict.numLocale, { maximumFractionDigits: 0 }),
      new Intl.NumberFormat(dict.numLocale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    ],
    [dict.numLocale]
  );
  const purity = Math.min(100, Math.max(0, lot.purity_pct));
  const counterparty =
    "producer_wallet" in lot
      ? t(dict.lotCard.counterpartyProducer, {
          name: lot.producer_name ?? ellipsify(lot.producer_wallet, 4),
        })
      : t(dict.lotCard.counterpartyBuyer, {
          wallet: ellipsify(lot.buyer_wallet, 4),
        });

  return (
    <Link
      href={`/batch/${lot.pda_address}`}
      style={{ "--bento-i": index } as CSSProperties}
      className="animate-bento-in block rounded-3xl bg-card p-2.5 transition-transform active:scale-[0.99]"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-b from-secondary via-background to-secondary">
        <LotModel lotId={lot.lot_id} volumeTonnes={lot.volume_tonnes} />
        <div className="pointer-events-none absolute top-3 left-3">
          <StatusBadge
            status={lot.status as LotStatus}
            labels={dict.lotStatus}
          />
        </div>
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
            <span className="ml-1 text-[11px] text-muted">dUSDC</span>
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
            label={dict.lotCard.volume}
            value={`${integerFmt.format(lot.volume_tonnes)} t`}
          />
          <MiniStat
            label={dict.lotCard.bigBags}
            value={integerFmt.format(bagCount(lot.volume_tonnes))}
          />
          <MiniStat
            label={dict.lotCard.purity}
            value={`${decimalFmt.format(purity)}%`}
          />
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border-low pt-2.5 text-[11px]">
          <span className="truncate text-muted">{counterparty}</span>
          <span className="shrink-0 font-semibold text-brand-700">
            {dict.lotCard.detail}
          </span>
        </div>

        {action}
      </div>
    </Link>
  );
}
