"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { passportPath } from "../../batch/verification";
import { useCluster } from "../../components/cluster-context";
import { PassportQr } from "../../components/passport-qr";
import { formatNumber } from "../data/points";
import { plantCertificateUrl, type Lot } from "../data/lots";
import type { Origin } from "../data/origins";
import { useOriginLots } from "../data/use-origin-lots";
import { NoLotes, OriginReference } from "./assets-panel";
import {
  LotMetrics,
  Skeleton,
  StatusBadge,
  TONNES_PER_BAG,
  bagCount,
  dateFmt,
  integerFmt,
} from "./lot-display";
import { Modal } from "./modal";

/** Contact target for the "Conectar con productor" CTA — placeholder until
 *  the operator configures a real address. */
const PRODUCER_CONTACT_HREF = "mailto:";

// R3F touches WebGL: client-only, never prerendered.
const LotModel = dynamic(() => import("./lot-model").then((m) => m.LotModel), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full animate-pulse place-items-center text-xs text-muted">
      Cargando 3D…
    </div>
  ),
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2 text-center">
      <p className="text-[10px] font-medium tracking-wide text-muted uppercase">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-xs font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

/** 3D stage with overlay badge and big-bag volume summary. */
function LotStage({ lot }: { lot: Lot }) {
  const bags = bagCount(lot.volume_tonnes);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-gradient-to-b from-card via-card to-background">
      <LotModel lotId={lot.lot_id} volumeTonnes={lot.volume_tonnes} />

      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <div className="min-w-0 rounded-lg bg-background/80 px-2.5 py-1.5 shadow-sm ring-1 ring-border backdrop-blur">
          <p className="truncate font-mono text-xs font-bold text-foreground">
            {lot.lot_id}
          </p>
          <p className="truncate text-[10px] text-muted">
            Li₂CO₃ · grado batería
          </p>
        </div>
        <span className="shrink-0">
          <StatusBadge status={lot.status} />
        </span>
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 text-[10px] text-muted">
        <span className="min-w-0 rounded-md bg-background/80 px-2 py-1 ring-1 ring-border backdrop-blur">
          {integerFmt.format(bags)} big bags · 1 ≈ {TONNES_PER_BAG} t
        </span>
        <span className="hidden shrink-0 sm:inline">Arrastrá para rotar</span>
      </div>
    </div>
  );
}

/** Featured lot: 3D stack, declared metrics, plant certificate and provenance. */
function LotDetail({ lot, origin }: { lot: Lot; origin: Origin }) {
  const { getExplorerUrl } = useCluster();
  const certificate = plantCertificateUrl(lot);

  return (
    <div className="space-y-3">
      <LotStage lot={lot} />
      <LotMetrics lot={lot} origin={origin} />

      <div className="space-y-1.5 rounded-xl border border-border bg-card px-3.5 py-3 text-[11px] text-muted">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span>
            Indexado el{" "}
            <span className="text-foreground/75">
              {dateFmt.format(new Date(lot.indexed_at))}
            </span>
          </span>
          <a
            href={getExplorerUrl(`/address/${lot.pda_address}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-400"
          >
            Ver en Explorer
          </a>
        </div>
        <p className="font-mono break-all">{lot.pda_address}</p>
        <p>
          <a
            href={certificate}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-400"
          >
            Certificado de planta (PDF)
          </a>{" "}
          · SHA-256{" "}
          <span className="font-mono">
            {lot.plant_cert_sha256.slice(0, 8)}…
            {lot.plant_cert_sha256.slice(-6)}
          </span>
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card px-3.5 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium tracking-wide text-muted uppercase">
            Pasaporte público
          </p>
          <Link
            href={passportPath(lot.pda_address)}
            target="_blank"
            className="text-[11px] font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-400"
          >
            Ver pasaporte
          </Link>
        </div>
        <div className="mt-3">
          <PassportQr pda={lot.pda_address} batchId={lot.lot_id} compact />
        </div>
      </div>
    </div>
  );
}

/** Placeholder of the origin fiche while the public index read is in flight. */
function FicheSkeleton() {
  return (
    <div role="status" aria-busy="true" className="p-5">
      <span className="sr-only">Cargando los lotes…</span>
      <div aria-hidden className="mx-auto max-w-xl space-y-3">
        <Skeleton className="aspect-[4/3] w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  );
}

/** Origin fiche: the mine's production profile — 3D stage, declared
 *  metrics, certificate, passport and public references for its featured
 *  lot (the first listed, else the most recent). */
export function OriginModal({
  origin,
  onClose,
}: {
  origin: Origin;
  onClose: () => void;
}) {
  const { state, retry } = useOriginLots(origin.id);

  const lots = state.status === "ready" ? state.lots : [];
  const selected = lots.find((l) => l.status === "listed") ?? lots[0];
  const availableTonnes = lots
    .filter((l) => l.status === "listed")
    .reduce((sum, l) => sum + l.volume_tonnes, 0);

  return (
    <Modal onClose={onClose} labelledBy="origin-modal-title" maxWidth={720}>
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

        {state.status === "loading" && (
          <div aria-hidden className="mt-3 grid grid-cols-2 gap-3 sm:max-w-xs">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        )}
        {state.status === "ready" && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-xs">
            <Stat
              label="Disponible"
              value={`${integerFmt.format(availableTonnes)} t`}
            />
            <Stat
              label="Capacidad"
              value={`${formatNumber(origin.capacity_tpa)} t/año`}
            />
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {state.status === "loading" && <FicheSkeleton />}

        {state.status === "error" && (
          <div className="p-5">
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
              <p role="alert" className="text-xs font-medium text-foreground">
                No se pudieron cargar los lotes.
              </p>
              <button
                type="button"
                onClick={retry}
                className="btn-secondary mt-3"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {state.status === "ready" && lots.length === 0 && (
          <div className="p-5">
            <NoLotes />
          </div>
        )}

        {state.status === "ready" && selected && (
          <div className="p-5">
            <section
              aria-label="Lote destacado"
              className="mx-auto max-w-xl space-y-3"
            >
              <LotDetail lot={selected} origin={origin} />
              <OriginReference origin={origin} />
            </section>
          </div>
        )}
      </div>

      {state.status === "ready" && selected && (
        <footer className="flex shrink-0 justify-center border-t border-border bg-card px-4 py-3">
          <a
            href={PRODUCER_CONTACT_HREF}
            className="btn-primary px-5 py-2.5 text-sm"
          >
            Conectar con productor
          </a>
        </footer>
      )}
    </Modal>
  );
}
