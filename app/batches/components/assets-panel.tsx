"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  batchTotal,
  batchesForSale,
  BATTERY_GRADE_PURITY_PCT,
  eventOf,
  formatDate,
  formatDelta,
  formatNumber,
  formatUsdc,
  shortHash,
  type Batch,
  type BatchStatus,
  type Origin,
} from "../data/points";

export type SortKey = "price" | "volume" | "water" | "carbon";

const SORT_LABELS: Record<SortKey, string> = {
  price: "Menor precio total",
  volume: "Mayor volumen",
  water: "Menor huella hídrica",
  carbon: "Menor huella de carbono",
};

const SORTERS: Record<SortKey, (a: Batch, b: Batch) => number> = {
  price: (a, b) => batchTotal(a) - batchTotal(b),
  volume: (a, b) => b.volumeTonnes - a.volumeTonnes,
  water: (a, b) => a.waterM3PerTonne - b.waterM3PerTonne,
  carbon: (a, b) => a.carbonKgPerTonne - b.carbonKgPerTonne,
};

export function sortBatches(batches: Batch[], key: SortKey) {
  return [...batches].sort(SORTERS[key]);
}

type Tone = "good" | "warn" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  good: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 ring-emerald-200 dark:ring-emerald-800",
  warn: "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 ring-amber-200 dark:ring-amber-800",
  neutral: "bg-secondary text-foreground/75 ring-border",
};

function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`mt-1.5 inline-block rounded-md px-1.5 py-0.5 text-[10px] leading-tight font-semibold ring-1 ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

function Metric({
  label,
  value,
  chip,
}: {
  label: string;
  value: string;
  chip?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-secondary px-2.5 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
      {chip}
    </div>
  );
}

function PurityChip({ purityPct }: { purityPct: number }) {
  const diff = Math.round((purityPct - BATTERY_GRADE_PURITY_PCT) * 100) / 100;
  if (diff === 0) return <Chip tone="good">Grado batería</Chip>;
  return (
    <Chip tone={diff > 0 ? "good" : "warn"}>
      {formatDelta(diff)} pp s/ mín.
    </Chip>
  );
}

function WaterChip({
  water,
  reference,
}: {
  water: number;
  reference?: number;
}) {
  if (reference === undefined) {
    return <Chip tone="neutral">Sin cifra publ.</Chip>;
  }
  const diff = Math.round((water - reference) * 10) / 10;
  return (
    <Chip tone={diff <= 0 ? "good" : "warn"}>
      {diff === 0 ? "=" : formatDelta(diff)} vs {formatNumber(reference)} publ.
    </Chip>
  );
}

export function BatchMetrics({
  batch,
  origin,
}: {
  batch: Batch;
  origin: Origin;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Metric label="Volumen" value={`${formatNumber(batch.volumeTonnes)} t`} />
      <Metric
        label="Pureza"
        value={`${batch.purityPct.toFixed(2)} %`}
        chip={<PurityChip purityPct={batch.purityPct} />}
      />
      <Metric
        label="Huella hídrica"
        value={`${formatNumber(batch.waterM3PerTonne)} m³/t`}
        chip={
          <WaterChip
            water={batch.waterM3PerTonne}
            reference={origin.reference.waterM3PerTonne}
          />
        }
      />
      <Metric
        label="Huella carbono"
        value={`${formatNumber(batch.carbonKgPerTonne)} kg/t`}
        chip={<Chip tone="neutral">Simulado</Chip>}
      />
    </div>
  );
}

const STATUS_LABEL: Record<BatchStatus, string> = {
  Created: "En auditoría",
  Audited: "Auditado",
  Completed: "Liquidado",
};

const STATUS_CLASSES: Record<BatchStatus, { pill: string; dot: string }> = {
  Created: {
    pill: "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 ring-amber-200 dark:ring-amber-800",
    dot: "bg-amber-500",
  },
  Audited: {
    pill: "bg-brand-50 dark:bg-brand-950/50 text-brand-800 dark:text-brand-200 ring-brand-200 dark:ring-brand-800",
    dot: "bg-brand-600",
  },
  Completed: {
    pill: "bg-secondary text-foreground/75 ring-border",
    dot: "bg-muted",
  },
};

export function StatusBadge({ status }: { status: BatchStatus }) {
  const classes = STATUS_CLASSES[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${classes.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${classes.dot}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

function handleVisualBuy(batchId: string) {
  toast.info("Demo visual: la compra todavía no está conectada.", {
    description: `Lote ${batchId} · solo visualización.`,
  });
}

export function BatchCard({
  batch,
  origin,
}: {
  batch: Batch;
  origin: Origin;
}) {
  const audited = eventOf(batch, "audited");
  return (
    <li className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-bold text-foreground">
            {batch.batchId}
          </p>
          {audited && (
            <p className="mt-0.5 text-xs text-muted">
              Auditado el {formatDate(audited.at)}
            </p>
          )}
        </div>
        <StatusBadge status={batch.status} />
      </div>

      <div className="mt-3">
        <BatchMetrics batch={batch} origin={origin} />
      </div>

      {batch.reportSha256 && (
        <p
          className="mt-3 truncate font-mono text-[11px] text-muted"
          title={batch.reportSha256}
        >
          SHA-256 informe: {shortHash(batch.reportSha256)}
        </p>
      )}

      <div className="mt-3 border-t border-border pt-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
          Total del lote
        </p>
        <p className="font-mono text-xl font-bold tabular-nums text-foreground">
          {formatUsdc(batchTotal(batch))}{" "}
          <span className="text-xs font-semibold text-muted">USDC</span>
        </p>
        <p className="text-xs text-muted">
          {formatUsdc(batch.priceUsdcPerTonne)} USDC/t ×{" "}
          {formatNumber(batch.volumeTonnes)} t
        </p>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => handleVisualBuy(batch.batchId)}
            className="flex-1 btn-primary"
          >
            Comprar
          </button>
        </div>
      </div>
    </li>
  );
}

/** Batch Created: waiting on the auditor. Visual only. */
function PendingBatchRow({ batch }: { batch: Batch }) {
  return (
    <li className="rounded-xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-sm font-bold text-foreground">
          {batch.batchId}
        </p>
        <StatusBadge status={batch.status} />
      </div>
      <p className="mt-1 text-xs text-foreground/75">
        {formatNumber(batch.volumeTonnes)} t · {batch.purityPct.toFixed(2)} % ·{" "}
        {formatNumber(batch.waterM3PerTonne)} m³/t ·{" "}
        {formatNumber(batch.carbonKgPerTonne)} kg/t
      </p>
    </li>
  );
}

/** Batch Completed: settled, traceability only. */
function SoldBatchRow({ batch }: { batch: Batch }) {
  const completed = eventOf(batch, "completed");
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs">
      <span className="font-mono font-semibold text-foreground">
        {batch.batchId}
      </span>
      <span className="text-muted">
        {formatNumber(batch.volumeTonnes)} t
        {completed && ` · ${formatDate(completed.at)}`}
      </span>
    </li>
  );
}

export function SortSelect({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (value: SortKey) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] text-muted">
      Ordenar
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="cursor-pointer rounded-md border border-border bg-card px-1.5 py-1 text-[11px] font-medium text-foreground"
      >
        {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
          <option key={key} value={key}>
            {SORT_LABELS[key]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function OriginReference({ origin }: { origin: Origin }) {
  return (
    <section className="rounded-xl border border-border bg-card px-3.5 py-3 text-xs text-foreground/75">
      <p className="font-semibold text-foreground">Referencia pública</p>
      <p className="mt-1">
        Capacidad: {formatNumber(origin.reference.capacityTpa)}
        {" "}t/año de Li₂CO₃
        {origin.reference.altitudeM &&
          ` · ${formatNumber(origin.reference.altitudeM)} m s. n. m.`}
      </p>
      <p className="mt-1">{origin.reference.note}</p>
      <a
        href={origin.reference.source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-block text-brand-700 dark:text-brand-400 underline underline-offset-2"
      >
        {origin.reference.source.label}
      </a>
    </section>
  );
}

/** Sections of one origin: on sale, auditing and sold. */
export function OriginBatches({
  origin,
  sort,
}: {
  origin: Origin;
  sort: SortKey;
}) {
  const forSale = sortBatches(batchesForSale(origin), sort);
  const pending = origin.batches.filter((b) => b.status === "Created");
  const sold = origin.batches.filter((b) => b.status === "Completed");

  return (
    <>
      {forSale.length > 0 ? (
        <ul className="space-y-3">
          {forSale.map((batch) => (
            <BatchCard key={batch.batchId} batch={batch} origin={origin} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
          No hay lotes auditados a la venta en este origen.
        </p>
      )}

      {pending.length > 0 && (
        <section className="mt-5">
          <h4 className="text-xs font-bold text-foreground">
            En auditoría ({pending.length})
          </h4>
          <ul className="mt-2 space-y-2">
            {pending.map((batch) => (
              <PendingBatchRow key={batch.batchId} batch={batch} />
            ))}
          </ul>
        </section>
      )}

      {sold.length > 0 && (
        <section className="mt-5">
          <h4 className="text-xs font-bold text-foreground">
            Vendidos ({sold.length})
          </h4>
          <ul className="mt-1">
            {sold.map((batch) => (
              <SoldBatchRow key={batch.batchId} batch={batch} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export function AssetsPanel({
  origin,
  onClose,
}: {
  origin: Origin;
  onClose: () => void;
}) {
  const [sort, setSort] = useState<SortKey>("price");
  const forSaleCount = batchesForSale(origin).length;

  return (
    <aside
      aria-label={`Lotes de ${origin.name}`}
      className="absolute inset-x-0 bottom-0 z-20 flex max-h-[65vh] flex-col rounded-t-2xl border border-border bg-background/95 shadow-2xl backdrop-blur md:top-24 md:bottom-4 md:left-auto md:right-4 md:max-h-none md:w-[400px] md:rounded-2xl"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="eyebrow">
            {origin.salar}
          </p>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight text-foreground">
            {origin.name}
          </h2>
          <p className="text-xs text-foreground/75">{origin.producer}</p>
          <p className="mt-0.5 text-[11px] text-muted">
            {origin.shareholders}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel"
          className="cursor-pointer rounded-lg p-1.5 text-muted transition hover:bg-accent hover:text-foreground"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-4 w-4"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <OriginReference origin={origin} />

        <div className="mt-5 mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">Lotes en venta</h3>
          {forSaleCount > 1 && <SortSelect value={sort} onChange={setSort} />}
        </div>
        <OriginBatches origin={origin} sort={sort} />
      </div>
    </aside>
  );
}
