"use client";

import { useCluster } from "../../components/cluster-context";
import type { Lot } from "../data/lots";
import { StatusBadge, decimalFmt, integerFmt, priceFmt } from "./lot-display";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium tracking-wide text-muted uppercase">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}

/** Public fiche of one indexed lot: status, declared metrics and provenance. */
export function LotCard({ lot }: { lot: Lot }) {
  const { getExplorerUrl } = useCluster();

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{lot.lot_id}</p>
        <StatusBadge status={lot.status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 md:grid-cols-3">
        <Metric
          label="Volumen"
          value={`${integerFmt.format(lot.volume_tonnes)} t`}
        />
        <Metric
          label="Pureza"
          value={`${decimalFmt.format(lot.purity_pct)}%`}
        />
        <Metric
          label="Huella hídrica"
          value={`${decimalFmt.format(lot.water_footprint_m3_per_tonne)} m³/t`}
        />
        <Metric
          label="Huella carbono"
          value={`${decimalFmt.format(lot.carbon_footprint_kg_co2e_per_tonne)} kg CO₂e/t`}
        />
        <Metric
          label="Precio del lote"
          value={`${priceFmt.format(lot.price_usdc)} USDC`}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border-low pt-3">
        <p className="font-mono text-[11px] break-all text-muted">
          {lot.pda_address}
        </p>
        <a
          href={getExplorerUrl(`/address/${lot.pda_address}`)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-semibold text-brand-700 underline underline-offset-2"
        >
          Ver en Explorer
        </a>
      </div>
    </article>
  );
}
