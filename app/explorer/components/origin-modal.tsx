"use client";

import { formatNumber } from "../data/points";
import type { Origin } from "../data/origins";
import { Modal } from "./modal";

/** Contact target for the "Conectar con productor" CTA — placeholder until
 *  the operator configures a real address. */
const PRODUCER_CONTACT_HREF = "mailto:";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary p-3">
      <p className="text-[10px] font-medium tracking-wide text-muted uppercase">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

/** Origin fiche: the mine's public profile — capacity, altitude, water
 *  footprint, plant coordinates and the cited source. No lot data: the
 *  catalogue mines are informational, not lots for sale. */
export function OriginModal({
  origin,
  onClose,
}: {
  origin: Origin;
  onClose: () => void;
}) {
  const stats = [
    {
      label: "Capacidad",
      value: `${formatNumber(origin.capacity_tpa)} t/año`,
    },
    ...(origin.altitude_m !== null
      ? [
          {
            label: "Altitud",
            value: `${formatNumber(origin.altitude_m)} m s. n. m.`,
          },
        ]
      : []),
    ...(origin.water_m3_per_tonne !== null
      ? [
          {
            label: "Huella hídrica",
            value: `${formatNumber(origin.water_m3_per_tonne)} m³/t`,
          },
        ]
      : []),
    {
      label: "Planta",
      value: `${origin.latitude.toFixed(4)}, ${origin.longitude.toFixed(4)}`,
    },
  ];

  return (
    <Modal onClose={onClose} labelledBy="origin-modal-title" maxWidth={560}>
      <header className="shrink-0 px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">
              {origin.salar} · {origin.code}
            </p>
            <h2
              id="origin-modal-title"
              className="mt-1 text-xl font-bold tracking-tight text-foreground"
            >
              {origin.name}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {origin.producer} · {origin.shareholders}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            autoFocus
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
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
        <div className="grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <Stat key={s.label} label={s.label} value={s.value} />
          ))}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted">{origin.note}</p>
        <a
          href={origin.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs font-semibold text-brand-700 underline underline-offset-2"
        >
          {origin.source_label} ↗
        </a>
      </div>

      <footer className="flex shrink-0 justify-center border-t border-border bg-card px-4 py-3">
        <a
          href={PRODUCER_CONTACT_HREF}
          className="btn-primary px-5 py-2.5 text-sm"
        >
          Conectar con productor
        </a>
      </footer>
    </Modal>
  );
}
