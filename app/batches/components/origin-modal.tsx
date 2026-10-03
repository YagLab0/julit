"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { formatNumber } from "../data/points";
import type { Origin } from "../data/origins";
import { NoLotes, OriginReference } from "./assets-panel";
import { Modal } from "./modal";
import { useWallet } from "../../lib/wallet/context";
import { createClient } from "../../lib/supabase/client";

type BatchRow = {
  batch_id: string;
  pda_address: string;
  volume_tonnes: number;
  purity_pct: number;
  water_footprint_m3_per_tonne: number;
  carbon_footprint_kg_co2e_per_tonne: number;
  price_usdc: number;
  status: string;
  reserved_buyer_wallet: string | null;
  buyer_wallet: string | null;
};

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

export function OriginModal({
  origin,
  filter = "sale",
  onClose,
}: {
  origin: Origin;
  filter?: "sale" | "purchased";
  onClose: () => void;
}) {
  const { wallet } = useWallet();
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    let query = supabase.from("batches").select("*").eq("origin_id", origin.id);
    if (filter === "purchased") {
      query = query.eq("status", "completed");
      if (wallet?.account?.address) {
        query = query.eq("buyer_wallet", wallet.account.address);
      }
    } else {
      query = query.eq("status", "audited");
    }

    query.then(({ data, error }) => {
      if (!active) return;
      setLoading(false);
      if (error) {
        console.error("Error loading origin batches", error);
        return;
      }
      const rows = (data ?? []) as BatchRow[];
      setBatches(rows);
      if (rows.length > 0) {
        setSelectedId(rows[0].batch_id);
      } else {
        setSelectedId(null);
      }
    });
    return () => {
      active = false;
    };
  }, [origin.id, filter, wallet?.account?.address]);

  const selected = batches.find((b) => b.batch_id === selectedId) ?? batches[0];

  const isReservedForOther = Boolean(
    selected?.reserved_buyer_wallet &&
      wallet?.account?.address !== selected.reserved_buyer_wallet
  );
  const isReservedForMe = Boolean(
    selected?.reserved_buyer_wallet &&
      wallet?.account?.address === selected.reserved_buyer_wallet
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

      const res = await fetch("/api/batches/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pda_address: selected.pda_address,
          completion_tx_signature: simulatedSignature,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error ?? "No se pudo registrar la compra simulada.");
        setBuying(false);
        return;
      }

      toast.success("Liquidación simulada confirmada", {
        description: `Lote ${selected.batch_id} registrado exitosamente. No se transfirieron fondos reales (ADR-0002).`,
      });

      // Remove the purchased batch from available list
      setBatches((prev) => prev.filter((b) => b.batch_id !== selected.batch_id));
      setSelectedId(null);
    } catch {
      toast.error("Error al procesar la liquidación simulada.");
    } finally {
      setBuying(false);
    }
  }

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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <OriginReference origin={origin} />
          <section
            aria-label={filter === "purchased" ? "Mis compras" : "Lotes en venta"}
            className="min-w-0"
          >
            <h3 className="mb-2 text-sm font-bold text-foreground">
              {filter === "purchased"
                ? "Mis lotes adquiridos"
                : "Lotes auditados en venta"}
            </h3>

            {loading ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
                {filter === "purchased"
                  ? "Cargando compras…"
                  : "Cargando lotes disponibles…"}
              </p>
            ) : batches.length === 0 ? (
              filter === "purchased" ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
                  No tenés lotes adquiridos en este origen.
                </p>
              ) : (
                <NoLotes />
              )
            ) : (
              <ul className="space-y-2">
                {batches.map((batch) => (
                  <li key={batch.batch_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(batch.batch_id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        batch.batch_id === selected?.batch_id
                          ? "border-brand-500 bg-brand-50/70 ring-1 ring-brand-500 dark:bg-brand-950/40"
                          : "border-border bg-card hover:border-brand-300 hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {batch.batch_id}
                        </span>
                        <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                          {Number(batch.price_usdc).toLocaleString("es-AR")}{" "}
                          <span className="text-[10px] font-semibold text-muted">
                            USDC
                          </span>
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted">
                        {formatNumber(batch.volume_tonnes)} t ·{" "}
                        {Number(batch.purity_pct).toFixed(2)} % Li₂CO₃ ·{" "}
                        {Number(batch.water_footprint_m3_per_tonne).toFixed(2)} m³/t
                      </p>
                      {batch.reserved_buyer_wallet && batch.status !== "completed" && (
                        <p className="mt-1 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                          {batch.reserved_buyer_wallet === wallet?.account?.address
                            ? "✓ Reservado para tu empresa"
                            : "🔒 Reservado"}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {selected && (
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-border bg-card px-5 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Total del lote ({selected.batch_id})
            </p>
            <p className="font-mono text-lg font-bold tabular-nums text-foreground">
              {Number(selected.price_usdc).toLocaleString("es-AR")}{" "}
              <span className="text-xs font-semibold text-muted">USDC</span>
            </p>
            <p className="truncate text-[11px] text-muted">
              {formatNumber(selected.volume_tonnes)} t · Li₂CO₃ grado batería
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {selected.status === "completed" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-50 dark:bg-brand-950/40 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                Lote adquirido
              </span>
            )}
            <Link
              href={`/batch/${selected.pda_address}`}
              className="btn-secondary text-xs px-3 py-2"
              target="_blank"
            >
              Ver Pasaporte Digital
            </Link>
            {selected.status !== "completed" && (
              <button
                type="button"
                disabled={buying || isReservedForOther}
                onClick={() => void handleBuy()}
                className={`min-w-32 px-5 py-2.5 text-sm transition ${
                  isReservedForOther
                    ? "cursor-not-allowed border border-border-low bg-secondary text-muted opacity-60"
                    : "btn-primary cursor-pointer"
                }`}
                title={
                  isReservedForOther
                    ? "Reservado para otra empresa"
                    : undefined
                }
              >
                {buying
                  ? "Confirmando…"
                  : isReservedForOther
                    ? "Reservado para otra empresa"
                    : isReservedForMe
                      ? "Comprar lote (Reservado)"
                      : "Comprar lote"}
              </button>
            )}
          </div>
        </footer>
      )}
    </Modal>
  );
}
