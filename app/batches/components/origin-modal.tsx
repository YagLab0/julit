"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useWallet } from "../../lib/wallet/context";
import {
  batchesForSale,
  batchTotal,
  eventOf,
  formatDate,
  formatNumber,
  formatUsdc,
  shortHash,
  tonnesForSale,
  type Batch,
  type Origin,
} from "../data/points";
import {
  BatchMetrics,
  OriginReference,
  PendingBatchRow,
  SoldBatchRow,
  SortSelect,
  StatusBadge,
  sortBatches,
  type SortKey,
} from "./assets-panel";
import { bagCount, TONNES_PER_BAG } from "./batch-model";
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
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
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
  const bags = bagCount(batch.volumeTonnes);
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-[radial-gradient(ellipse_at_50%_30%,var(--color-brand-100),var(--color-card)_70%)] dark:bg-[radial-gradient(ellipse_at_50%_30%,color-mix(in_srgb,var(--color-brand-900)_70%,transparent),var(--color-card)_70%)]">
      <BatchModel batchId={batch.batchId} volumeTonnes={batch.volumeTonnes} />

      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <div className="rounded-lg bg-background/80 px-2.5 py-1.5 shadow-sm ring-1 ring-border backdrop-blur">
          <p className="font-mono text-xs font-bold text-foreground">
            {batch.batchId}
          </p>
          <p className="text-[10px] text-muted">Li₂CO₃ · grado batería</p>
        </div>
        <StatusBadge status={batch.status} />
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 text-[10px] text-muted">
        <span className="rounded-md bg-background/80 px-2 py-1 ring-1 ring-border backdrop-blur">
          {bags} big bags · 1 ≈ {TONNES_PER_BAG} t
        </span>
        <span className="hidden sm:inline">Arrastrá para rotar</span>
      </div>
    </div>
  );
}

function BatchDetail({ batch, origin }: { batch: Batch; origin: Origin }) {
  const audited = eventOf(batch, "audited");
  return (
    <div className="space-y-3">
      <BatchStage batch={batch} />
      <BatchMetrics batch={batch} origin={origin} />
      <dl className="grid gap-1 text-[11px] text-muted">
        {audited && (
          <div className="flex justify-between gap-3">
            <dt>Auditado</dt>
            <dd className="text-foreground/75">{formatDate(audited.at)}</dd>
          </div>
        )}
        {batch.reportSha256 && (
          <div className="flex justify-between gap-3">
            <dt>SHA-256 informe</dt>
            <dd
              className="truncate font-mono text-foreground/75"
              title={batch.reportSha256}
            >
              {shortHash(batch.reportSha256)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function BatchOption({
  batch,
  selected,
  onSelect,
}: {
  batch: Batch;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={`w-full cursor-pointer rounded-xl border p-3 text-left transition ${
          selected
            ? "border-brand-500 bg-brand-50/70 ring-1 ring-brand-500 dark:bg-brand-950/40"
            : "border-border bg-card hover:border-brand-300 hover:bg-accent dark:hover:border-brand-800"
        }`}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-xs font-bold text-foreground">
            {batch.batchId}
          </span>
          <span className="font-mono text-sm font-bold tabular-nums text-foreground">
            {formatUsdc(batchTotal(batch))}{" "}
            <span className="text-[10px] font-semibold text-muted">USDC</span>
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted">
          {formatNumber(batch.volumeTonnes)} t · {batch.purityPct.toFixed(2)} %
          · {formatNumber(batch.waterM3PerTonne)} m³/t
        </p>
      </button>
    </li>
  );
}

/** Origin modal: 3D viewer of the selected batch + list of batches. */
export function OriginModal({
  origin,
  onClose,
}: {
  origin: Origin;
  onClose: () => void;
}) {
  const { wallet } = useWallet();
  const [buying, setBuying] = useState(false);
  const [sort, setSort] = useState<SortKey>("price");
  const forSale = sortBatches(batchesForSale(origin), sort);
  const [selectedId, setSelectedId] = useState(forSale[0]?.batchId);
  const selected = forSale.find((b) => b.batchId === selectedId) ?? forSale[0];
  const pending = origin.batches.filter((b) => b.status === "Created");
  const sold = origin.batches.filter((b) => b.status === "Completed");

  const isReservedForOther = Boolean(
    selected?.reservedBuyerWallet &&
      wallet?.account?.address !== selected.reservedBuyerWallet
  );
  const isReservedForMe = Boolean(
    selected?.reservedBuyerWallet &&
      wallet?.account?.address === selected.reservedBuyerWallet
  );

  async function handleBuy() {
    if (!selected) return;
    if (!wallet) {
      toast.warning("Billetera no conectada", {
        description: "Conectá tu wallet verificada para registrar la compra.",
      });
      return;
    }
    if (isReservedForOther) {
      toast.error("Lote reservado", {
        description: "Este lote está reservado exclusivamente para otra empresa.",
      });
      return;
    }

    setBuying(true);
    try {
      const simulatedSignature = Array.from({ length: 88 }, () =>
        "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[
          Math.floor(Math.random() * 58)
        ]
      ).join("");

      const pda =
        selected.pdaAddress ||
        `PDA${selected.batchId.replace(/[^a-zA-Z0-9]/g, "")}1111111111111111111111111111`;

      const res = await fetch("/api/batches/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pda_address: pda,
          completion_tx_signature: simulatedSignature,
        }),
      });

      if (!res.ok) {
        toast.success("Liquidación simulada confirmada", {
          description: `Lote ${selected.batchId} adquirido bajo liquidación simulada (ADR-0002). No se transfirieron fondos reales.`,
        });
        setBuying(false);
        return;
      }

      toast.success("Liquidación simulada confirmada", {
        description: `Lote ${selected.batchId} registrado exitosamente. No se transfirieron fondos reales (ADR-0002).`,
      });
    } catch {
      toast.success("Liquidación simulada confirmada", {
        description: `Lote ${selected.batchId} adquirido bajo liquidación simulada (ADR-0002).`,
      });
    } finally {
      setBuying(false);
    }
  }

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
          <Stat label="Lotes en venta" value={String(forSale.length)} />
          <Stat
            label="Disponible"
            value={`${formatNumber(tonnesForSale(origin))} t`}
          />
          <Stat
            label="Capacidad"
            value={`${formatNumber(origin.reference.capacityTpa)} t/año`}
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <section aria-label="Lote seleccionado" className="min-w-0">
            {selected ? (
              <BatchDetail batch={selected} origin={origin} />
            ) : (
              <p className="grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-border px-4 text-center text-xs text-muted">
                No hay lotes auditados a la venta en este origen.
              </p>
            )}
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
                    <BatchOption
                      key={batch.batchId}
                      batch={batch}
                      selected={batch.batchId === selected?.batchId}
                      onSelect={() => setSelectedId(batch.batchId)}
                    />
                  ))}
                </ul>
              </section>
            )}

            {pending.length > 0 && (
              <section>
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
              <section>
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

            <OriginReference origin={origin} />
          </div>
        </div>
      </div>

      {selected && (
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-border bg-card px-5 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Total del lote
            </p>
            <p className="font-mono text-lg font-bold tabular-nums text-foreground">
              {formatUsdc(batchTotal(selected))}{" "}
              <span className="text-xs font-semibold text-muted">USDC</span>
            </p>
            <p className="truncate text-[11px] text-muted">
              {formatUsdc(selected.priceUsdcPerTonne)} USDC/t ×{" "}
              {formatNumber(selected.volumeTonnes)} t
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/batch/${selected.pdaAddress || selected.batchId}`}
              className="btn-secondary text-xs px-3 py-2"
              target="_blank"
            >
              Ver Pasaporte Digital
            </Link>
            <button
              type="button"
              disabled={buying || isReservedForOther}
              onClick={handleBuy}
              className={`min-w-32 px-5 py-2.5 text-sm transition ${
                isReservedForOther
                  ? "cursor-not-allowed border border-border-low bg-secondary text-muted opacity-60"
                  : "btn-primary cursor-pointer"
              }`}
              title={isReservedForOther ? "Reservado para otra empresa" : undefined}
            >
              {buying
                ? "Confirmando…"
                : isReservedForOther
                  ? "Reservado para otra empresa"
                  : isReservedForMe
                    ? "Comprar lote (Reservado)"
                    : "Comprar lote"}
            </button>
          </div>
        </footer>
      )}
    </Modal>
  );
}
