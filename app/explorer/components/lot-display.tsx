import type { ReactNode } from "react";
import type { Lot, LotStatus } from "../data/lots";
import type { Origin } from "../data/origins";

// ---------------------------------------------------------------------------
// Visual scale and formatting (es-AR, per FRONTEND.md).
// ---------------------------------------------------------------------------

/** Tonnes represented by one big bag in the 3D model (visual scale only). */
export const TONNES_PER_BAG = 40;

/** Ceiling for rendered bags: a probe row must not stall the scene. */
export const MAX_BAGS = 60;

export function bagCount(volumeTonnes: number) {
  return Math.max(1, Math.round(volumeTonnes / TONNES_PER_BAG));
}

export const integerFmt = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});
export const decimalFmt = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const priceFmt = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});
export const deltaFmt = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
export const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const BATTERY_GRADE_PURITY_PCT = 99.5;

// ---------------------------------------------------------------------------
// Status badge and metric chips.
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<LotStatus, string> = {
  listed: "Publicado",
  funded: "Fondeado",
  disputed: "En disputa",
  redeemed: "Liquidado",
  claimed: "Cobrado",
  cancelled: "Cancelado",
};

const STATUS_CLASSES: Record<LotStatus, { pill: string; dot: string }> = {
  listed: {
    pill: "bg-brand-50 text-brand-800 ring-brand-200",
    dot: "bg-brand-600",
  },
  funded: {
    pill: "bg-amber-50 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
  },
  disputed: {
    pill: "bg-amber-50 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
  },
  redeemed: {
    pill: "bg-secondary text-foreground/75 ring-border",
    dot: "bg-muted",
  },
  claimed: {
    pill: "bg-secondary text-foreground/75 ring-border",
    dot: "bg-muted",
  },
  cancelled: {
    pill: "bg-secondary text-foreground/75 ring-border",
    dot: "bg-muted",
  },
};

export function StatusBadge({
  status,
  labels = STATUS_LABELS,
}: {
  status: LotStatus;
  /** Localized label set; the account passes its dictionary copy. */
  labels?: Record<LotStatus, string>;
}) {
  const classes = STATUS_CLASSES[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${classes.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${classes.dot}`} />
      {labels[status]}
    </span>
  );
}

/** Neutral shimmer block for in-flight reads. */
export function Skeleton({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-secondary motion-reduce:animate-none ${className}`}
    />
  );
}

type Tone = "good" | "warn" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  good: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warn: "bg-amber-50 text-amber-800 ring-amber-200",
  neutral: "bg-secondary text-foreground/75 ring-border",
};

export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] leading-tight font-semibold ring-1 ${TONE_CLASSES[tone]}`}
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
  chip?: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-secondary px-2.5 py-2">
      <p className="text-[10px] font-medium tracking-wide text-muted uppercase">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
      {chip && <div className="mt-1.5">{chip}</div>}
    </div>
  );
}

function PurityChip({ purityPct }: { purityPct: number }) {
  const diff = Math.round((purityPct - BATTERY_GRADE_PURITY_PCT) * 100) / 100;
  if (diff === 0) return <Chip tone="good">Grado batería</Chip>;
  return (
    <Chip tone={diff > 0 ? "good" : "warn"}>
      {deltaFmt.format(diff)} pp s/ mín.
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
      {diff === 0 ? "=" : deltaFmt.format(diff)} vs{" "}
      {decimalFmt.format(reference)} publ.
    </Chip>
  );
}

/** Declared production and sustainability metrics of one lot. */
export function LotMetrics({
  lot,
  origin,
}: {
  lot: Pick<
    Lot,
    | "volume_tonnes"
    | "purity_pct"
    | "water_footprint_m3_per_tonne"
    | "carbon_footprint_kg_co2e_per_tonne"
  >;
  origin: Origin;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Metric
        label="Volumen"
        value={`${integerFmt.format(lot.volume_tonnes)} t`}
      />
      <Metric
        label="Pureza"
        value={`${decimalFmt.format(lot.purity_pct)} %`}
        chip={<PurityChip purityPct={lot.purity_pct} />}
      />
      <Metric
        label="Huella hídrica"
        value={`${decimalFmt.format(lot.water_footprint_m3_per_tonne)} m³/t`}
        chip={
          <WaterChip
            water={lot.water_footprint_m3_per_tonne}
            reference={origin.water_m3_per_tonne ?? undefined}
          />
        }
      />
      <Metric
        label="Huella carbono"
        value={`${decimalFmt.format(lot.carbon_footprint_kg_co2e_per_tonne)} kg CO₂e/t`}
        chip={<Chip tone="neutral">Declarado</Chip>}
      />
    </div>
  );
}
