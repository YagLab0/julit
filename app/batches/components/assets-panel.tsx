import { formatNumber } from "../data/points";
import type { Origin } from "../data/origins";

/**
 * Reference block for one origin: the public figures cited in the catalogue
 * (capacity, altitude, water footprint, note and source). No batch data.
 */
export function OriginReference({ origin }: { origin: Origin }) {
  return (
    <section className="rounded-xl border border-border bg-card px-3.5 py-3 text-xs text-foreground/75">
      <p className="font-semibold text-foreground">Referencia pública</p>
      <p className="mt-1">
        Capacidad: {formatNumber(origin.capacity_tpa)} t/año de Li₂CO₃
        {origin.altitude_m !== null &&
          ` · ${formatNumber(origin.altitude_m)} m s. n. m.`}
      </p>
      {origin.water_m3_per_tonne !== null && (
        <p className="mt-1">
          Huella hídrica publicada: {formatNumber(origin.water_m3_per_tonne)}{" "}
          m³/t Li₂CO₃
        </p>
      )}
      <p className="mt-1">{origin.note}</p>
      <a
        href={origin.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-block text-brand-700 dark:text-brand-400 underline underline-offset-2"
      >
        {origin.source_label}
      </a>
    </section>
  );
}

/** Honest empty state: an origin with no indexed batches, never a fake count. */
export function NoLotes() {
  return (
    <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
      Sin lotes registrados en este origen.
    </p>
  );
}
