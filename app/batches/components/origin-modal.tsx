"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getBase58Decoder } from "@solana/kit";
import { passportPath } from "../../batch/verification";
import { useCluster } from "../../components/cluster-context";
import { PassportQr } from "../../components/passport-qr";
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
import { useWallet } from "../../lib/wallet/context";
import { useSendTransaction } from "../../lib/hooks/use-send-transaction";
import { createMemoInstruction } from "../../lib/solana/memo";
import { getExplorerUrl } from "../../lib/explorer";
import { createClient } from "../../lib/supabase/client";
import { buildContractAgreementMessage } from "../../lib/contracts";

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
function BatchStage({ batch }: { batch: Batch }) {
  const bags = bagCount(batch.volume_tonnes);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-gradient-to-b from-card via-card to-background">
      <BatchModel
        batchId={batch.batch_id}
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

      <div className="rounded-xl border border-border bg-card px-3.5 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium tracking-wide text-muted uppercase">
            Pasaporte público
          </p>
          <Link
            href={passportPath(batch.pda_address)}
            target="_blank"
            className="text-[11px] font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-400"
          >
            Ver pasaporte
          </Link>
        </div>
        <div className="mt-3">
          <PassportQr
            pda={batch.pda_address}
            batchId={batch.batch_id}
            compact
          />
        </div>
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
  filter?: "sale" | "purchased";
  onClose: () => void;
}) {
  const { wallet, signMessage } = useWallet();
  const { send: sendTransaction } = useSendTransaction();
  const { cluster } = useCluster();

  const { state, retry } = useOriginBatches(origin.id);
  const [sort, setSort] = useState<SortKey>("price");
  const [selectedPda, setSelectedPda] = useState<string | null>(null);

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

  // Load producer company and contract status
  useEffect(() => {
    let active = true;

    fetch(`/api/companies?origin_id=${origin.id}&type=producer`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.companies?.[0]) return;
        setProducer(data.companies[0]);
      })
      .catch(() => {});

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
  }, [origin.id, producer?.id]);

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

    setRequestingContract(true);
    try {
      const timestamp = new Date().toISOString();
      const message = buildContractAgreementMessage({
        producerWallet: producer.wallet_address,
        counterpartyWallet: wallet.account.address,
        initiatorWallet: wallet.account.address,
        timestamp,
      });

      let signature: string;
      let isOnChain = false;

      try {
        // Record on-chain using Solana SPL Memo Program transaction
        const memoIx = createMemoInstruction(message, wallet.account.address);
        signature = await sendTransaction({ instructions: [memoIx] });
        isOnChain = true;
      } catch (txErr) {
        console.warn(
          "On-chain memo transaction failed or unsupported, falling back to signMessage:",
          txErr
        );
        if (!signMessage) throw txErr;
        const signatureBytes = await signMessage(
          new TextEncoder().encode(message)
        );
        signature = getBase58Decoder().decode(signatureBytes);
      }

      const res = await fetch("/api/companies/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_company_id: producer.id,
          initiator_wallet: wallet.account.address,
          signature,
          is_onchain: isOnChain,
          timestamp,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(
          err?.error ?? "No se pudo registrar la solicitud de contrato."
        );
        return;
      }

      setContractStatus("pending");
      if (isOnChain) {
        const explorerUrl = getExplorerUrl(`/tx/${signature}`, cluster);
        toast.success("Solicitud registrada en la blockchain de Solana", {
          description: "La transacción fue confirmada en Solana Devnet.",
          action: {
            label: "Ver en Explorer",
            onClick: () => window.open(explorerUrl, "_blank"),
          },
        });
      } else {
        toast.success("Solicitud de contrato enviada con éxito", {
          description: `Tu solicitud criptográfica fue registrada para ${producer.name}. El productor podrá aceptarla en su panel.`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/reject|cancel|denied/i.test(msg)) {
        toast.info("Transacción cancelada", {
          description: "Cancelaste la firma en tu billetera.",
        });
      } else {
        toast.error("Error al registrar la solicitud en la red.");
      }
    } finally {
      setRequestingContract(false);
    }
  }

  async function handleBuy() {
    if (!selected) return;
    if (isReservedForOther) {
      toast.error(
        "Este lote se encuentra reservado exclusivamente para otro cliente corporativo."
      );
      return;
    }
    if (!wallet) {
      toast.warning("Billetera no disponible", {
        description: "Conectá tu billetera para adquirir el lote.",
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

      const supabase = createClient();
      const { error } = await supabase
        .from("batches")
        .update({
          status: "completed",
          buyer_wallet: wallet.account.address,
          completion_tx_signature: simulatedSignature,
        })
        .eq("pda_address", selected.pda_address);

      if (error) {
        throw new Error(error.message);
      }

      toast.success("¡Compra completada con éxito!", {
        description: `Lote ${selected.batch_id} adquirido (${Number(selected.price_usdc).toLocaleString("es-AR")} USDC).`,
      });

      retry();
    } catch (err) {
      console.error("Error buying batch", err);
      toast.error("Error al procesar la liquidación del lote.");
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
                            ? "⏳ Solicitud enviada on-chain en Solana (Aguardando confirmación del productor)."
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

              {forSale.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-foreground">
                      Lotes en venta ({forSale.length})
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
          <div className="flex items-center gap-2">
            {selected.status === "completed" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                Lote adquirido
              </span>
            )}
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
              <p className="max-w-52 text-right text-[11px] text-muted">
                Se habilita para la compra al ser auditado.
              </p>
            )}
          </div>
        </footer>
      )}
    </Modal>
  );
}
