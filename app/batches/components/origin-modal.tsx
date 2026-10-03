"use client";

import { formatNumber } from "../data/points";
import type { Origin } from "../data/origins";
import { NoLotes, OriginReference } from "./assets-panel";
import { Modal } from "./modal";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="truncate font-mono text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

/** Origin fiche: catalogue fields + public reference. No batch content. */
export function OriginModal({
  origin,
  onClose,
}: {
  origin: Origin;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} labelledBy="origin-modal-title" maxWidth={880}>
      <header className="shrink-0 border-b border-border px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">
              {origin.salar} · {origin.code}
            </p>
            <h2
              id="origin-modal-title"
              className="mt-0.5 text-xl font-bold tracking-tight text-foreground"
            >
              {origin.name}
            </h2>
            <p className="truncate text-xs text-muted">
              {origin.producer} · {origin.shareholders}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-muted">
              Planta: {origin.latitude.toFixed(4)},{" "}
              {origin.longitude.toFixed(4)}
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
        <div className="mt-3 grid grid-cols-3 gap-3 sm:max-w-md">
          <Stat
            label="Capacidad"
            value={`${formatNumber(origin.capacity_tpa)} t/año`}
          />
          <Stat
            label="Altitud"
            value={
              origin.altitude_m === null
                ? "—"
                : `${formatNumber(origin.altitude_m)} m`
            }
          />
          <Stat
            label="Huella hídrica"
            value={
              origin.water_m3_per_tonne === null
                ? "—"
                : `${formatNumber(origin.water_m3_per_tonne)} m³/t`
            }
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <OriginReference origin={origin} />
          <section aria-label="Lotes" className="min-w-0">
            <h3 className="mb-2 text-sm font-bold text-foreground">Lotes</h3>
            <NoLotes />
          </section>
        </div>
      </div>
    </Modal>
  );
}
