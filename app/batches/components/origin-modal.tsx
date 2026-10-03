"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import React, { Component, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getBase58Decoder } from "@solana/kit";
import { formatNumber } from "../data/points";
import type { Origin } from "../data/origins";
import { OriginReference } from "./assets-panel";
import { bagCount, TONNES_PER_BAG } from "./batch-model";
import { Modal } from "./modal";
import { useWallet } from "../../lib/wallet/context";
import { createClient } from "../../lib/supabase/client";
import { buildContractAgreementMessage } from "../../lib/contracts";

export type BatchRow = {
  batch_id: string;
  pda_address: string;
  origin_id: string;
  producer_wallet: string;
  auditor_wallet: string | null;
  volume_tonnes: number;
  purity_pct: number;
  water_footprint_m3_per_tonne: number;
  carbon_footprint_kg_co2e_per_tonne: number;
  price_usdc: number;
  status: string;
  audit_sha256: string | null;
  audit_certificate_path: string | null;
  esg_approved: boolean | null;
  eu_regulation_assessment: string | null;
  reserved_buyer_wallet: string | null;
  buyer_wallet: string | null;
  indexed_at: string;
  creation_tx_signature: string | null;
  audit_tx_signature: string | null;
  completion_tx_signature: string | null;
};

// Dynamic client-only import for Three.js Canvas to prevent SSR issues
const BatchModel = dynamic(
  () => import("./batch-model").then((m) => m.BatchModel),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center text-xs text-muted">
        Cargando modelo 3D…
      </div>
    ),
  }
);

class WebGLErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  override render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function shortHash(hash: string | null | undefined): string {
  if (!hash) return "—";
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

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

function StatusBadge({ status }: { status: string }) {
  if (status === "audited") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Auditado · En venta
      </span>
    );
  }
  if (status === "created") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        En auditoría técnica
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-600 dark:text-brand-400">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
        Lote adquirido
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted">
      {status}
    </span>
  );
}

function BatchStage({ batch }: { batch: BatchRow }) {
  const bags = bagCount(batch.volume_tonnes);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-[radial-gradient(ellipse_at_50%_30%,var(--color-brand-100),var(--color-card)_70%)] dark:bg-[radial-gradient(ellipse_at_50%_30%,color-mix(in_srgb,var(--color-brand-900)_70%,transparent),var(--color-card)_70%)]">
      <WebGLErrorBoundary
        fallback={
          <div className="grid h-full w-full place-items-center p-4 text-center text-xs text-muted">
            Vista 3D no disponible en este dispositivo
          </div>
        }
      >
        <BatchModel
          batchId={batch.batch_id}
          volumeTonnes={batch.volume_tonnes}
        />
      </WebGLErrorBoundary>

      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <div className="rounded-lg bg-background/85 px-2.5 py-1.5 shadow-sm ring-1 ring-border backdrop-blur">
          <p className="font-mono text-xs font-bold text-foreground">
            {batch.batch_id}
          </p>
          <p className="text-[10px] text-muted">Li₂CO₃ · grado batería</p>
        </div>
        <StatusBadge status={batch.status} />
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 text-[10px] text-muted">
        <span className="rounded-md bg-background/85 px-2 py-1 font-mono ring-1 ring-border backdrop-blur">
          {bags} big bags · 1 ≈ {TONNES_PER_BAG} t
        </span>
        <span className="hidden rounded-md bg-background/85 px-2 py-1 ring-1 ring-border backdrop-blur sm:inline">
          Arrastrá para rotar
        </span>
      </div>
    </div>
  );
}

function BatchDetail({ batch }: { batch: BatchRow }) {
  const isBatteryGrade = batch.purity_pct >= 99.5;
  const pricePerTonne =
    batch.volume_tonnes > 0 ? batch.price_usdc / batch.volume_tonnes : 0;

  return (
    <div className="space-y-4">
      <BatchStage batch={batch} />

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Pureza química
          </p>
          <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-foreground">
            {Number(batch.purity_pct).toFixed(2)} %
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            {isBatteryGrade ? "✓ Grado batería" : "Grado técnico"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Huella hídrica
          </p>
          <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-foreground">
            {Number(batch.water_footprint_m3_per_tonne).toFixed(2)}{" "}
            <span className="text-xs font-normal text-muted">m³/t</span>
          </p>
          <p className="mt-0.5 text-[10px] text-muted">Extracción y planta</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Huella de carbono
          </p>
          <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-foreground">
            {Number(batch.carbon_footprint_kg_co2e_per_tonne).toFixed(2)}{" "}
            <span className="text-xs font-normal text-muted">kg CO₂e/t</span>
          </p>
          <p className="mt-0.5 text-[10px] text-muted">Alcance 1 y 2</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Volumen lote
          </p>
          <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-foreground">
            {formatNumber(batch.volume_tonnes)}{" "}
            <span className="text-xs font-normal text-muted">t</span>
          </p>
          <p className="mt-0.5 text-[10px] text-muted">Li₂CO₃ ensacado</p>
        </div>
      </div>

      {/* Compliance & ESG */}
      <div className="space-y-2.5 rounded-xl border border-border bg-card p-3.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground">
            Declaración ambiental y regulatoria
          </span>
          {batch.esg_approved ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              ESG Aprobado
            </span>
          ) : (
            <span className="text-[11px] text-muted">ESG Pendiente</span>
          )}
        </div>

        <div className="rounded-lg bg-secondary/50 p-2.5 text-[11px] leading-relaxed text-foreground/80">
          <p className="font-medium text-foreground">
            Reglamento UE 2023/1542:
          </p>
          <p className="mt-0.5 text-muted">
            {batch.eu_regulation_assessment ||
              "Cumple requisitos de diligencia debida y pasaporte digital."}
          </p>
        </div>

        {batch.audit_sha256 && (
          <div className="flex items-center justify-between border-t border-border-low pt-1 text-[11px] text-muted">
            <span>Certificado SHA-256</span>
            <span
              className="font-mono text-foreground"
              title={batch.audit_sha256}
            >
              {shortHash(batch.audit_sha256)}
            </span>
          </div>
        )}
      </div>

      {/* Pricing Summary */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Precio unitario estimado
          </p>
          <p className="font-mono text-sm font-semibold text-foreground">
            {pricePerTonne.toLocaleString("es-AR", {
              maximumFractionDigits: 2,
            })}{" "}
            USDC/t
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Precio total del lote
          </p>
          <p className="font-mono text-lg font-bold tabular-nums text-foreground">
            {Number(batch.price_usdc).toLocaleString("es-AR")}{" "}
            <span className="text-xs font-semibold text-muted">USDC</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function BatchOption({
  batch,
  selected,
  onSelect,
  walletAddress,
}: {
  batch: BatchRow;
  selected: boolean;
  onSelect: () => void;
  walletAddress?: string;
}) {
  const isReserved = Boolean(
    batch.reserved_buyer_wallet && batch.status !== "completed"
  );
  const isReservedForMe =
    isReserved && batch.reserved_buyer_wallet === walletAddress;

  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={`w-full cursor-pointer rounded-xl border p-3 text-left transition ${
          selected
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
            <span className="text-[10px] font-semibold text-muted">USDC</span>
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted">
          {formatNumber(batch.volume_tonnes)} t ·{" "}
          {Number(batch.purity_pct).toFixed(2)} % ·{" "}
          {Number(batch.water_footprint_m3_per_tonne).toFixed(2)} m³/t
        </p>
        {isReserved && (
          <p className="mt-1 text-[10px] font-medium text-amber-700 dark:text-amber-400">
            {isReservedForMe
              ? "✓ Reservado para tu empresa"
              : "🔒 Reservado para otra empresa"}
          </p>
        )}
      </button>
    </li>
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
  const { wallet, signMessage } = useWallet();
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [producer, setProducer] = useState<{
    id: string;
    name: string;
    wallet_address: string;
  } | null>(null);
  const [contractStatus, setContractStatus] = useState<
    "none" | "pending" | "accepted" | "revoked"
  >("none");
  const [requestingContract, setRequestingContract] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    const query = supabase
      .from("batches")
      .select("*")
      .eq("origin_id", origin.id)
      .order("indexed_at", { ascending: false });

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
        if (filter === "purchased") {
          const purchasedBatch = rows.find((r) => r.status === "completed");
          setSelectedId(
            purchasedBatch ? purchasedBatch.batch_id : rows[0].batch_id
          );
        } else {
          const saleBatch = rows.find((r) => r.status === "audited");
          setSelectedId(saleBatch ? saleBatch.batch_id : rows[0].batch_id);
        }
      } else {
        setSelectedId(null);
      }
    });

    // Fetch producer company for this origin
    fetch(`/api/companies?origin_id=${origin.id}&type=producer`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.companies?.[0]) return;
        setProducer(data.companies[0]);
      })
      .catch(() => {});

    // Fetch user contracts
    fetch("/api/companies/contracts")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.contracts) return;
        const matching = data.contracts.find(
          (c: {
            producer?: { origin_id?: string; id?: string };
            producer_id?: string;
            status: "none" | "pending" | "accepted" | "revoked";
          }) =>
            c.producer?.origin_id === origin.id ||
            c.producer?.id === producer?.id ||
            c.producer_id === producer?.id
        );
        if (matching) {
          setContractStatus(matching.status);
        } else {
          setContractStatus("none");
        }
      })
      .catch(() => {});


    return () => {
      active = false;
    };
  }, [origin.id, filter, producer?.id]);

  const selected = batches.find((b) => b.batch_id === selectedId) ?? batches[0];

  const forSale = batches.filter((b) => b.status === "audited");
  const inAudit = batches.filter((b) => b.status === "created");
  const completed = batches.filter((b) => b.status === "completed");

  const isReservedForOther = Boolean(
    selected?.reserved_buyer_wallet &&
    wallet?.account?.address !== selected.reserved_buyer_wallet
  );
  const isReservedForMe = Boolean(
    selected?.reserved_buyer_wallet &&
    wallet?.account?.address === selected.reserved_buyer_wallet
  );

  async function handleRequestContract() {
    if (!producer) {
      toast.error(
        "No se pudo identificar la empresa productora de este origen."
      );
      return;
    }
    if (!wallet) {
      toast.warning("Billetera no conectada", {
        description:
          "Conectá tu billetera para solicitar el contrato comercial.",
      });
      return;
    }
    if (!signMessage) {
      toast.warning("Firma no disponible", {
        description: "Tu billetera no soporta firma de mensajes (signMessage).",
      });
      return;
    }

    setRequestingContract(true);
    try {
      const timestamp = new Date().toISOString();
      const message = buildContractAgreementMessage({
        producerWallet: producer.wallet_address,
        counterpartyWallet: wallet.account.address,
        initiatorWallet: wallet.account.address,
        timestamp,
      });

      const signatureBytes = await signMessage(
        new TextEncoder().encode(message)
      );
      const signature = getBase58Decoder().decode(signatureBytes);

      const res = await fetch("/api/companies/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_company_id: producer.id,
          initiator_wallet: wallet.account.address,
          signature,
          timestamp,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(
          err?.error ?? "No se pudo solicitar el contrato comercial."
        );
        return;
      }

      setContractStatus("pending");
      toast.success("Solicitud de contrato enviada con éxito", {
        description: `Tu solicitud criptográfica fue registrada para ${producer.name}. El productor podrá aceptarla en su panel.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/reject|cancel|denied/i.test(msg)) {
        toast.info("Firma cancelada", {
          description: "Cancelaste la firma en tu billetera.",
        });
      } else {
        toast.error("Error al firmar o enviar la solicitud.");
      }
    } finally {
      setRequestingContract(false);
    }
  }

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
        description:
          "Este lote está reservado exclusivamente para otra empresa.",
      });
      return;
    }

    setBuying(true);
    try {
      const simulatedSignature = Array.from(
        { length: 88 },
        () =>
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

      // Update state locally so batch moves to completed section
      setBatches((prev) =>
        prev.map((b) =>
          b.batch_id === selected.batch_id
            ? {
                ...b,
                status: "completed",
                buyer_wallet: wallet.account.address,
              }
            : b
        )
      );
    } catch {
      toast.error("Error al procesar la liquidación simulada.");
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
            label="Huella hídrica ref."
            value={
              origin.water_m3_per_tonne === null
                ? "—"
                : `${formatNumber(origin.water_m3_per_tonne)} m³/t`
            }
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          {/* Left Column: Selected Batch Showcase */}
          <section aria-label="Lote seleccionado" className="min-w-0">
            {selected ? (
              <BatchDetail batch={selected} />
            ) : (
              <div className="grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-border px-4 text-center text-xs text-muted">
                {loading
                  ? "Cargando lote…"
                  : "No hay lotes registrados en este origen."}
              </div>
            )}
          </section>

          {/* Right Column: Categorized Batches & Origin Reference */}
          <div className="min-w-0 space-y-5">
            {/* Commercial Contract Banner */}
            {producer && (
              <section className="rounded-xl border border-border bg-card p-3.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      Acuerdo comercial · {producer.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {contractStatus === "accepted"
                        ? "✓ Tu empresa está autorizada para reservar y adquirir lotes exclusivos."
                        : contractStatus === "pending"
                          ? "⏳ Solicitud enviada criptográficamente (Aguardando firma del productor)."
                          : "Requerido para la asignación preferencial y reserva exclusiva de lotes."}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {contractStatus === "accepted" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Cliente habilitado
                      </span>
                    ) : contractStatus === "pending" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Solicitud enviada
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={requestingContract}
                        onClick={() => void handleRequestContract()}
                        className="btn-primary cursor-pointer px-3 py-1.5 text-xs whitespace-nowrap"
                      >
                        {requestingContract
                          ? "Firmando…"
                          : "Solicitar contrato comercial"}
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            {loading ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
                Cargando lotes del origen…
              </p>
            ) : batches.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
                Sin lotes registrados en este origen.
              </p>
            ) : (
              <>
                {/* Lotes en venta */}
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">
                      Lotes en venta ({forSale.length})
                    </h3>
                  </div>
                  {forSale.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted">
                      No hay lotes auditados a la venta en este momento.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {forSale.map((b) => (
                        <BatchOption
                          key={b.batch_id}
                          batch={b}
                          selected={b.batch_id === selected?.batch_id}
                          onSelect={() => setSelectedId(b.batch_id)}
                          walletAddress={wallet?.account?.address}
                        />
                      ))}
                    </ul>
                  )}
                </section>

                {/* En auditoría */}
                {inAudit.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-xs font-bold text-foreground">
                      En auditoría técnica ({inAudit.length})
                    </h3>
                    <ul className="space-y-2">
                      {inAudit.map((b) => (
                        <BatchOption
                          key={b.batch_id}
                          batch={b}
                          selected={b.batch_id === selected?.batch_id}
                          onSelect={() => setSelectedId(b.batch_id)}
                          walletAddress={wallet?.account?.address}
                        />
                      ))}
                    </ul>
                  </section>
                )}

                {/* Lotes adquiridos */}
                {completed.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-xs font-bold text-foreground">
                      Lotes adquiridos ({completed.length})
                    </h3>
                    <ul className="space-y-2">
                      {completed.map((b) => (
                        <BatchOption
                          key={b.batch_id}
                          batch={b}
                          selected={b.batch_id === selected?.batch_id}
                          onSelect={() => setSelectedId(b.batch_id)}
                          walletAddress={wallet?.account?.address}
                        />
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}

            <OriginReference origin={origin} />
          </div>
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
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                Lote adquirido
              </span>
            )}
            <Link
              href={`/batch/${selected.pda_address}`}
              className="btn-secondary px-3 py-2 text-xs"
              target="_blank"
            >
              Ver Pasaporte Digital
            </Link>
            {selected.status === "audited" && (
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
                  isReservedForOther ? "Reservado para otra empresa" : undefined
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
            {selected.status === "created" && (
              <button
                type="button"
                disabled
                className="cursor-not-allowed border border-border-low bg-secondary px-4 py-2 text-xs text-muted opacity-75"
              >
                En auditoría técnica
              </button>
            )}
          </div>
        </footer>
      )}
    </Modal>
  );
}
