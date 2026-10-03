"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";
import { useCluster } from "../../components/cluster-context";
import { formatNumber } from "../data/points";
import { batchCertificateUrl, type Batch } from "../data/batches";
import type { Origin } from "../data/origins";
import { useOriginBatches } from "../data/use-origin-batches";
import { NoLotes, OriginReference } from "./assets-panel";
import {
  BatchFindings,
  BatchMetrics,
  BatchRow,
  Skeleton,
  SortSelect,
  StatusBadge,
  TONNES_PER_BAG,
  bagCount,
  dateFmt,
  integerFmt,
  priceFmt,
  sortBatches,
  type SortKey,
} from "./batch-display";
import { Modal } from "./modal";

// R3F touches WebGL: client-only, never prerendered.
const BatchModel = dynamic(
  () => import("./batch-model").then((m) => m.BatchModel),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full animate-pulse place-items-center text-xs text-muted">
        Cargando 3D…
      </div>
    ),
  }
);

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium tracking-wide text-muted uppercase">
        {label}
      </p>
      <p className="truncate font-mono text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

/** Single 3D viewer for the selected batch, with HUD overlays. */
function BatchStage({ batch }: { batch: Batch }) {
  const bags = bagCount(batch.volume_tonnes);
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-[radial-gradient(ellipse_at_50%_30%,var(--color-brand-100),var(--color-card)_70%)] dark:bg-[radial-gradient(ellipse_at_50%_30%,color-mix(in_srgb,var(--color-brand-900)_70%,transparent),var(--color-card)_70%)]">
      <BatchModel
        batchId={batch.pda_address}
        volumeTonnes={batch.volume_tonnes}
      />

      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <div className="rounded-lg bg-background/80 px-2.5 py-1.5 shadow-sm ring-1 ring-border backdrop-blur">
          <p className="font-mono text-xs font-bold text-foreground">
            {batch.batch_id}
          </p>
          <p className="text-[10px] text-muted">Li₂CO₃ · grado batería</p>
        </div>
        <StatusBadge status={batch.status} />
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 text-[10px] text-muted">
        <span className="rounded-md bg-background/80 px-2 py-1 ring-1 ring-border backdrop-blur">
          {integerFmt.format(bags)} big bags · 1 ≈ {TONNES_PER_BAG} t
        </span>
        <span className="hidden sm:inline">Arrastrá para rotar</span>
      </div>
    </div>
  );
}

/** Selected batch: 3D stack, declared metrics, findings and provenance. */
function BatchDetail({ batch, origin }: { batch: Batch; origin: Origin }) {
  const { getExplorerUrl } = useCluster();
  const certificate = batchCertificateUrl(batch);

  return (
    <div className="space-y-3">
      <BatchStage batch={batch} />
      <BatchMetrics batch={batch} origin={origin} />
      <BatchFindings batch={batch} />

      <div className="space-y-1.5 rounded-xl border border-border bg-card px-3.5 py-3 text-[11px] text-muted">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span>
            Indexado el{" "}
            <span className="text-foreground/75">
              {dateFmt.format(new Date(batch.indexed_at))}
            </span>
          </span>
          <a
            href={getExplorerUrl(`/address/${batch.pda_address}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-400"
          >
            Ver en Explorer
          </a>
        </div>
        <p className="font-mono break-all">{batch.pda_address}</p>
        {certificate !== null && batch.audit_sha256 !== null && (
          <p>
            <a
              href={certificate}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-400"
            >
              Certificado PDF
            </a>{" "}
            · SHA-256{" "}
            <span className="font-mono">
              {batch.audit_sha256.slice(0, 8)}…{batch.audit_sha256.slice(-6)}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

/** Placeholder of the batch fiche while the public index read is in flight. */
function FicheSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="grid grid-cols-1 gap-5 p-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]"
    >
      <span className="sr-only">Cargando los lotes…</span>
      <div aria-hidden className="min-w-0 space-y-3">
        <Skeleton className="aspect-[4/3] w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <div aria-hidden className="min-w-0 space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  );
}

/** Origin fiche: 3D viewer of the selected batch, its indexed batches and reference. */
export function OriginModal({
  origin,
  onClose,
}: {
  origin: Origin;
  onClose: () => void;
}) {
  const { state, retry } = useOriginBatches(origin.id);
  const [sort, setSort] = useState<SortKey>("price");
  const [selectedPda, setSelectedPda] = useState<string | null>(null);

  const batches = state.status === "ready" ? state.batches : [];
  const forSale = sortBatches(
    batches.filter((b) => b.status === "audited"),
    sort
  );
  const created = batches.filter((b) => b.status === "created");
  const completed = batches.filter((b) => b.status === "completed");
  const selected =
    batches.find((b) => b.pda_address === selectedPda) ??
    forSale[0] ??
    created[0] ??
    completed[0];
  const availableTonnes = forSale.reduce((sum, b) => sum + b.volume_tonnes, 0);

  return (
    <Modal onClose={onClose} labelledBy="origin-modal-title" maxWidth={1040}>
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
          <div aria-hidden className="mt-3 grid grid-cols-3 gap-3 sm:max-w-md">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        )}
        {state.status === "ready" && (
          <div className="mt-3 grid grid-cols-3 gap-3 sm:max-w-md">
            <Stat label="Lotes a la venta" value={String(forSale.length)} />
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

        {state.status === "ready" && batches.length === 0 && (
          <div className="p-5">
            <NoLotes />
          </div>
        )}

        {state.status === "ready" && selected && (
          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <section aria-label="Lote seleccionado" className="min-w-0">
              <BatchDetail batch={selected} origin={origin} />
            </section>

            <div className="min-w-0 space-y-5">
              {forSale.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-foreground">
                      Lotes en venta
                    </h3>
                    <SortSelect value={sort} onChange={setSort} />
                  </div>
                  <ul className="space-y-2">
                    {forSale.map((batch) => (
                      <BatchRow
                        key={batch.pda_address}
                        batch={batch}
                        selected={batch.pda_address === selected.pda_address}
                        onSelect={() => setSelectedPda(batch.pda_address)}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {created.length > 0 && (
                <section>
                  <h4 className="text-xs font-bold text-foreground">
                    Creados ({created.length})
                  </h4>
                  <ul className="mt-2 space-y-2">
                    {created.map((batch) => (
                      <BatchRow
                        key={batch.pda_address}
                        batch={batch}
                        selected={batch.pda_address === selected.pda_address}
                        onSelect={() => setSelectedPda(batch.pda_address)}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {completed.length > 0 && (
                <section>
                  <h4 className="text-xs font-bold text-foreground">
                    Completados ({completed.length})
                  </h4>
                  <ul className="mt-2 space-y-2">
                    {completed.map((batch) => (
                      <BatchRow
                        key={batch.pda_address}
                        batch={batch}
                        selected={batch.pda_address === selected.pda_address}
                        onSelect={() => setSelectedPda(batch.pda_address)}
                      />
                    ))}
                  </ul>
                </section>
              )}

              <OriginReference origin={origin} />
            </div>
          </div>
        )}
      </div>

      {state.status === "loading" && (
        <footer
          aria-hidden
          className="flex shrink-0 items-center justify-between gap-4 border-t border-border bg-card px-5 py-3"
        >
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </footer>
      )}

      {state.status === "ready" && selected && (
        <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-border bg-card px-5 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium tracking-wide text-muted uppercase">
              Total del lote
            </p>
            <p className="font-mono text-lg font-bold tabular-nums text-foreground">
              {priceFmt.format(selected.price_usdc)}{" "}
              <span className="text-xs font-semibold text-muted">USDC</span>
            </p>
            <p className="truncate text-[11px] text-muted">
              {integerFmt.format(selected.volume_tonnes)} t de Li₂CO₃ ·{" "}
              {selected.batch_id}
            </p>
          </div>
          {selected.status === "audited" ? (
            <button
              type="button"
              onClick={() =>
                toast.info(
                  "Demo visual: la compra todavía no está conectada.",
                  {
                    description: `Lote ${selected.batch_id} · solo visualización.`,
                  }
                )
              }
              className="btn-primary min-w-32 px-5 py-2.5 text-sm"
            >
              Comprar lote
            </button>
          ) : (
            <p className="max-w-52 text-right text-[11px] text-muted">
              {selected.status === "created"
                ? "Se habilita para la compra al ser auditado."
                : "Compra simulada: no hubo transferencia de fondos."}
            </p>
          )}
        </footer>
      )}
    </Modal>
  );
}
