"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { address, getBase58Decoder } from "@solana/kit";
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
  LotRow,
  Skeleton,
  SortSelect,
  StatusBadge,
  TONNES_PER_BAG,
  bagCount,
  dateFmt,
  integerFmt,
  priceFmt,
  sortLots,
  type SortKey,
} from "./lot-display";
import { Modal } from "./modal";
import { useWallet } from "../../lib/wallet/context";
import { useSendTransaction } from "../../lib/hooks/use-send-transaction";
import { createMemoInstruction } from "../../lib/solana/memo";
import { getExplorerUrl } from "../../lib/explorer";
import { buildContractAgreementMessage } from "../../lib/contracts";
import { createSolanaClient } from "../../lib/solana-client";
import {
  createAtaInstruction,
  findAssociatedTokenAddress,
} from "../../lib/solana/ata";
import {
  fetchConfig,
  findConfigPda,
  getFundLotInstructionAsync,
} from "../../generated/julit";

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

/** Selected lot: 3D stack, declared metrics, plant certificate and provenance. */
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

/** Placeholder of the lot fiche while the public index read is in flight. */
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

/** Origin fiche: 3D viewer of the selected lot, its indexed lots and reference. */
export function OriginModal({
  origin,
  onClose,
}: {
  origin: Origin;
  filter?: "sale" | "purchased";
  onClose: () => void;
}) {
  const { wallet, signMessage, signer } = useWallet();
  const { send: sendTransaction } = useSendTransaction();
  const { cluster } = useCluster();

  const { state, retry } = useOriginLots(origin.id);
  const [sort, setSort] = useState<SortKey>("price");
  const [selectedPda, setSelectedPda] = useState<string | null>(null);

  const [producer, setProducer] = useState<{
    id: string;
    name: string;
    wallet_address: string;
  } | null>(null);
  const [contractStatus, setContractStatus] = useState<
    "none" | "pending" | "accepted" | "revoked"
  >("none");
  const [requestingContract, setRequestingContract] = useState(false);
  const [funding, setFunding] = useState(false);

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

  const lots = state.status === "ready" ? state.lots : [];
  const listed = sortLots(
    lots.filter((l) => l.status === "listed"),
    sort
  );
  const settled = lots.filter((l) => l.status !== "listed");
  const selected =
    lots.find((l) => l.pda_address === selectedPda) ?? listed[0] ?? settled[0];
  const availableTonnes = listed.reduce((sum, l) => sum + l.volume_tonnes, 0);

  const isDesignatedBuyer = Boolean(
    selected && wallet?.account?.address === selected.buyer_wallet
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
    if (!selected || !isDesignatedBuyer) return;
    if (!signer) {
      toast.warning("Billetera sin firma", {
        description:
          "Tu billetera no puede firmar transacciones; reconectala para fondear el lote.",
      });
      return;
    }
    if (cluster !== "devnet") {
      toast.warning("Cambiá a Solana Devnet", {
        description: "El fondeo del lote corre sobre la red Devnet.",
      });
      return;
    }

    setFunding(true);
    try {
      const { rpc } = createSolanaClient("devnet");
      const configPda = await findConfigPda();
      const config = await fetchConfig(rpc, configPda[0], {
        commitment: "confirmed",
      });
      const usdcMint = config.data.usdcMint;
      const [buyerAta] = await findAssociatedTokenAddress(
        signer.address,
        usdcMint
      );

      const fundIx = await getFundLotInstructionAsync({
        lot: address(selected.pda_address),
        buyer: signer,
        usdcMint,
      });
      const txSignature = await sendTransaction({
        instructions: [
          createAtaInstruction(
            signer.address,
            buyerAta,
            signer.address,
            usdcMint
          ),
          fundIx,
        ],
      });

      const res = await fetch("/api/lots/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lot_pda: selected.pda_address,
          tx_signature: txSignature,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error("El fondeo quedó on-chain pero falló el índice.", {
          description:
            err?.error ??
            "El pago ya está en el escrow; el pasaporte puede tardar en reflejarlo.",
        });
        return;
      }

      retry();
      toast.success(`Lote ${selected.lot_id} fondeado en escrow`, {
        description:
          "El pago queda custodiado hasta que confirmes la recepción.",
        action: {
          label: "Ver en Explorer",
          onClick: () =>
            window.open(
              getExplorerUrl(`/tx/${txSignature}`, cluster),
              "_blank"
            ),
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/reject|cancel|denied/i.test(msg)) {
        toast.info("Transacción cancelada", {
          description: "Cancelaste la firma en tu billetera.",
        });
      } else {
        toast.error("No se pudo fondear el lote.", {
          description: "Verificá el saldo de dUSDC y reintentá.",
        });
      }
    } finally {
      setFunding(false);
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
            <Stat label="Lotes publicados" value={String(listed.length)} />
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
          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <section aria-label="Lote seleccionado" className="min-w-0">
              <LotDetail lot={selected} origin={origin} />
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
                          ? "Tu empresa puede ser designada compradora de nuevos lotes."
                          : contractStatus === "pending"
                            ? "Solicitud enviada on-chain en Solana (aguardando confirmación del productor)."
                            : "Requerido para que la productora te designe comprador de un lote."}
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

              {listed.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-foreground">
                      Lotes publicados ({listed.length})
                    </h3>
                    <SortSelect value={sort} onChange={setSort} />
                  </div>
                  <ul className="space-y-2">
                    {listed.map((lot) => (
                      <LotRow
                        key={lot.pda_address}
                        lot={lot}
                        selected={lot.pda_address === selected.pda_address}
                        onSelect={() => setSelectedPda(lot.pda_address)}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {settled.length > 0 && (
                <section>
                  <h4 className="text-xs font-bold text-foreground">
                    En liquidación o cerrados ({settled.length})
                  </h4>
                  <ul className="mt-2 space-y-2">
                    {settled.map((lot) => (
                      <LotRow
                        key={lot.pda_address}
                        lot={lot}
                        selected={lot.pda_address === selected.pda_address}
                        onSelect={() => setSelectedPda(lot.pda_address)}
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
          className="flex shrink-0 flex-col gap-3 border-t border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg sm:w-32" />
        </footer>
      )}

      {state.status === "ready" && selected && (
        <footer className="flex shrink-0 flex-col gap-3 border-t border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
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
              {selected.lot_id}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            {selected.status === "listed" && (
              <button
                type="button"
                disabled={!isDesignatedBuyer || funding}
                onClick={() => void handleBuy()}
                className={`w-full px-5 py-2.5 text-sm transition sm:w-auto sm:min-w-32 ${
                  isDesignatedBuyer && !funding
                    ? "btn-primary cursor-pointer"
                    : "cursor-not-allowed border border-border-low bg-secondary text-muted opacity-60"
                }`}
                title={
                  isDesignatedBuyer
                    ? undefined
                    : "Este lote está designado a otra empresa"
                }
              >
                {funding
                  ? "Fondeando…"
                  : isDesignatedBuyer
                    ? "Comprar lote (designado)"
                    : "Designado a otra empresa"}
              </button>
            )}
            {selected.status === "funded" && (
              <p className="text-[11px] text-muted sm:max-w-52 sm:text-right">
                Fondeado en escrow: pendiente de confirmación de recepción.
              </p>
            )}
          </div>
        </footer>
      )}
    </Modal>
  );
}
