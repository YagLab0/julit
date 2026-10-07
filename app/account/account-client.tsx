"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { getBase58Decoder } from "@solana/kit";
import { toast } from "sonner";
import { COMPANY_TYPE_LABELS, type CompanyType } from "../lib/company";
import { originName } from "../lib/origins";
import { ellipsify, getExplorerUrl } from "../lib/explorer";
import { useWallet } from "../lib/wallet/context";
import { useSendTransaction } from "../lib/hooks/use-send-transaction";
import { createMemoInstruction } from "../lib/solana/memo";
import { useCluster } from "../components/cluster-context";
import { WalletButton } from "../components/wallet-button";
import { StatusBadge } from "../explorer/components/lot-display";
import { buildContractAgreementMessage } from "../lib/contracts";
import type { AccountContract } from "./account-data";

export type AccountCompany = {
  name: string;
  companyType: CompanyType;
  walletAddress: string | null;
  walletVerifiedAt: string | null;
  originId: string | null;
  purityPct: number | null;
  waterM3PerTonne: number | null;
  carbonKgCo2ePerTonne: number | null;
};

export type AcquiredLot = {
  lot_id: string;
  pda_address: string;
  status: "funded" | "disputed" | "redeemed" | "claimed";
  volume_tonnes: number;
  purity_pct: number;
  price_usdc: number;
  fund_tx_signature: string | null;
  redeem_tx_signature: string | null;
  origin_id: string;
  indexed_at: string;
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  accepted: "Aceptado",
  revoked: "Rechazado",
};

const CONTRACT_STATUS_STYLES: Record<string, string> = {
  pending:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  accepted:
    "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  revoked: "bg-secondary text-muted",
};

const CARD = "rounded-3xl bg-card p-6";

const EMPTY_ICONS = {
  lots: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="size-9"
    >
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  ),
  contract: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="size-9"
    >
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" />
      <path d="M14 3v6h6M9 13h6M9 17h4" />
    </svg>
  ),
  offers: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="size-9"
    >
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.5Z" />
    </svg>
  ),
};

export function EmptyState({
  icon,
  title,
  body,
  action,
  secondaryAction,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="text-muted">{icon}</div>
      <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">{body}</p>
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

export function BuyerPortfolioCard({
  lots,
  className,
}: {
  lots: AcquiredLot[];
  className?: string;
}) {
  const { cluster } = useCluster();

  return (
    <section className={`${CARD} ${className ?? ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">
            Portafolio de Lotes Adquiridos
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Lotes designados a tu empresa con pago en escrow en Devnet.
          </p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs text-muted">
          {lots.length} {lots.length === 1 ? "lote" : "lotes"}
        </span>
      </div>

      {lots.length === 0 ? (
        <EmptyState
          icon={EMPTY_ICONS.lots}
          title="Todavía no tenés lotes adquiridos"
          body="Navegá el catálogo: los lotes publicados que te designen compradora se fondean con escrow."
          action={
            <Link
              href="/account/catalogo"
              className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:opacity-90"
            >
              Ir al catálogo
            </Link>
          }
        />
      ) : (
        <div className="mt-4 space-y-2">
          {lots.map((lot) => (
            <div
              key={lot.lot_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary p-4 text-sm"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-foreground">
                    {lot.lot_id}
                  </span>
                  <StatusBadge status={lot.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {lot.volume_tonnes} t · {Number(lot.purity_pct).toFixed(2)} %
                  Li₂CO₃ · Origen: {originName(lot.origin_id)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/batch/${lot.pda_address || lot.lot_id}`}
                  className="btn-secondary rounded-full text-xs px-3 py-1.5"
                >
                  Ver Pasaporte
                </Link>
                {lot.redeem_tx_signature && (
                  <a
                    href={getExplorerUrl(
                      `/tx/${lot.redeem_tx_signature}`,
                      cluster
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                  >
                    Explorer
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function BuyerContractsCard({
  contracts,
  className,
}: {
  contracts: AccountContract[];
  className?: string;
}) {
  const router = useRouter();
  const { wallet, signMessage } = useWallet();
  const { send: sendTransaction } = useSendTransaction();
  const { cluster } = useCluster();
  const [showModal, setShowModal] = useState(false);
  const [producers, setProducers] = useState<
    Array<{
      id: string;
      name: string;
      origin_id: string;
      wallet_address: string;
    }>
  >([]);
  const [selectedProducerId, setSelectedProducerId] = useState<string>("");
  const [requesting, setRequesting] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  async function openRequestModal() {
    setShowModal(true);
    try {
      const res = await fetch("/api/companies?type=producer");
      if (res.ok) {
        const data = await res.json();
        const list = data.companies ?? [];
        setProducers(list);
        if (list.length > 0 && !selectedProducerId) {
          setSelectedProducerId(list[0].id);
        }
      }
    } catch {
      toast.error("Error al cargar las productoras disponibles.");
    }
  }

  async function handleCreateContract() {
    const producer = producers.find((p) => p.id === selectedProducerId);
    if (!producer) {
      toast.error("Seleccioná una empresa productora.");
      return;
    }
    if (!wallet) {
      toast.warning("Billetera no disponible", {
        description: "Conectá tu billetera para solicitar el contrato.",
      });
      return;
    }

    setRequesting(true);
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
        const memoIx = createMemoInstruction(message, wallet.account.address);
        signature = await sendTransaction({ instructions: [memoIx] });
        isOnChain = true;
      } catch (txErr) {
        console.warn(
          "On-chain memo transaction failed, falling back to signMessage:",
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
        toast.error(err?.error ?? "No se pudo registrar la solicitud.");
        return;
      }

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
        toast.success("Solicitud enviada", {
          description: `Acuerdo solicitado a ${producer.name}.`,
        });
      }

      setShowModal(false);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/reject|cancel|denied/i.test(msg)) {
        toast.info("Transacción cancelada");
      } else {
        toast.error("Error al registrar la solicitud.");
      }
    } finally {
      setRequesting(false);
    }
  }

  async function respondOffer(id: string, action: "accept" | "decline") {
    setRespondingId(id);
    try {
      const res = await fetch(`/api/companies/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(err?.error ?? "No se pudo responder el contrato.");
        return;
      }
      router.refresh();
    } finally {
      setRespondingId(null);
    }
  }

  const pendingIncoming = contracts.filter(
    (c) => c.posture === "responder" && c.status === "pending"
  );

  return (
    <section className={`${CARD} ${className ?? ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">
            Contratos comerciales de suministro
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Acuerdos bilaterales con productoras mineras para reservar y
            adquirir lotes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void openRequestModal()}
          className="btn-secondary rounded-full text-xs px-4 py-1.5 cursor-pointer"
        >
          + Solicitar contrato
        </button>
      </div>

      {showModal && (
        <div className="mt-4 rounded-2xl bg-brand-50 dark:bg-brand-950/40 p-4">
          <p className="text-xs font-semibold text-foreground">
            Nueva solicitud de contrato de suministro
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            Al solicitar el contrato firmarás criptográficamente con tu
            billetera verificada.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              value={selectedProducerId}
              onChange={(e) => setSelectedProducerId(e.target.value)}
              className="rounded-full border border-border bg-card px-4 py-2 text-xs text-foreground"
            >
              {producers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({originName(p.origin_id) ?? p.origin_id})
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={requesting || !selectedProducerId}
              onClick={() => void handleCreateContract()}
              className="btn-primary rounded-full text-xs px-4 py-2 cursor-pointer"
            >
              {requesting
                ? "Firmando solicitud…"
                : "Firmar y solicitar con wallet"}
            </button>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-secondary rounded-full text-xs px-4 py-2 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {pendingIncoming.length > 0 && (
        <div className="mt-4 space-y-2">
          {pendingIncoming.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50/60 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/40"
            >
              <p className="text-xs">
                <span className="font-medium">{c.producer?.name}</span>{" "}
                <span className="text-muted">te ofrece un contrato</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void respondOffer(c.id, "accept")}
                  disabled={respondingId !== null}
                  className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background"
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  onClick={() => void respondOffer(c.id, "decline")}
                  disabled={respondingId !== null}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        {contracts.length === 0 ? (
          <EmptyState
            icon={EMPTY_ICONS.contract}
            title="Todavía no tenés contratos"
            body="Solicitá un acuerdo de suministro a una productora para empezar a reservar lotes."
            action={
              <button
                type="button"
                onClick={() => void openRequestModal()}
                className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:opacity-90"
              >
                Solicitar contrato
              </button>
            }
            secondaryAction={
              <Link
                href="/account/catalogo"
                className="rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground transition hover:bg-accent"
              >
                Ver catálogo
              </Link>
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {contracts.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary p-4 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {c.producer?.name ?? "Productor"}
                    </span>
                    {c.producer?.origin_id && (
                      <span className="text-[11px] text-muted">
                        · {originName(c.producer.origin_id)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-muted">
                    Wallet productora:{" "}
                    {ellipsify(c.producer?.wallet_address ?? "", 6)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted font-mono">
                    <span className="flex items-center gap-1.5">
                      Firma iniciador:{" "}
                      {c.initiator_signature ? (
                        <>
                          <span>{ellipsify(c.initiator_signature, 8)}</span>
                          <a
                            href={getExplorerUrl(
                              `/tx/${c.initiator_signature}`,
                              cluster
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="font-sans text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                          >
                            Explorer ↗
                          </a>
                        </>
                      ) : (
                        "—"
                      )}
                    </span>
                    {c.counterparty_signature && (
                      <span className="flex items-center gap-1.5">
                        Aceptación:{" "}
                        <span>{ellipsify(c.counterparty_signature, 8)}</span>
                        <a
                          href={getExplorerUrl(
                            `/tx/${c.counterparty_signature}`,
                            cluster
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="font-sans text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                        >
                          Explorer ↗
                        </a>
                      </span>
                    )}
                  </div>
                </div>

                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${CONTRACT_STATUS_STYLES[c.status]}`}
                >
                  {CONTRACT_STATUS_LABELS[c.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function ContractsCard({
  contracts,
  directory,
  className,
}: {
  contracts: AccountContract[];
  directory: { id: string; name: string }[];
  className?: string;
}) {
  const router = useRouter();
  const [counterpartyId, setCounterpartyId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function offerContract() {
    if (!counterpartyId) return;
    setBusy(true);
    setError(null);

    const response = await fetch("/api/companies/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterparty_id: counterpartyId }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? "No se pudo ofrecer el contrato.");
      setBusy(false);
      return;
    }

    setCounterpartyId("");
    setBusy(false);
    router.refresh();
  }

  return (
    <section className={`${CARD} ${className ?? ""}`}>
      <h2 className="text-sm font-semibold">Contratos comerciales</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Ofrecé un contrato a una compradora para habilitarla como cliente de tus
        lotes.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void offerContract();
        }}
        className="mt-4 flex flex-wrap gap-2"
      >
        <select
          value={counterpartyId}
          onChange={(e) => setCounterpartyId(e.target.value)}
          disabled={busy}
          aria-label="Compradora"
          className="rounded-full border border-border bg-card px-4 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
        >
          <option value="">Elegir compradora…</option>
          {directory.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={busy || !counterpartyId}
          className="btn-primary rounded-full px-4"
        >
          {busy ? "Enviando…" : "Ofrecer contrato"}
        </button>
      </form>

      {contracts.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {contracts.map((c) => {
            const other = c.role === "producer" ? c.counterparty : c.producer;
            return (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-2xl bg-secondary px-4 py-3"
              >
                <p className="text-xs">
                  <span className="font-medium">{other?.name}</span>{" "}
                  <span className="text-muted">
                    (
                    {COMPANY_TYPE_LABELS[
                      other?.company_type ?? "buyer"
                    ].toLowerCase()}
                    {c.posture === "responder"
                      ? " · oferta recibida"
                      : " · oferta enviada"}
                    )
                  </span>
                </p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${CONTRACT_STATUS_STYLES[c.status]}`}
                >
                  {CONTRACT_STATUS_LABELS[c.status]}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {contracts.length === 0 && (
        <EmptyState
          icon={EMPTY_ICONS.contract}
          title="Todavía no hay contratos"
          body="Ofrecé un contrato a una compradora desde el formulario para habilitarla como cliente de tus lotes."
        />
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

export function BuyerOffersCard({
  contracts,
  className,
}: {
  contracts: AccountContract[];
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(id: string, action: "accept" | "decline") {
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/companies/contracts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? "No se pudo responder el contrato.");
      setBusy(false);
      return;
    }

    setBusy(false);
    router.refresh();
  }

  const pending = contracts.filter(
    (c) => c.posture === "responder" && c.status === "pending"
  );

  return (
    <section className={`${CARD} ${className ?? ""}`}>
      <h2 className="text-sm font-semibold">Ofertas de compradoras</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Las compradoras te ofrecen contratos para reservar tus lotes. Aceptalas
        para habilitarlas como clientes.
      </p>

      {pending.length === 0 ? (
        <EmptyState
          icon={EMPTY_ICONS.offers}
          title="Sin ofertas pendientes"
          body="Cuando una compradora te ofrezca un contrato para reservar tus lotes, va a aparecer acá."
        />
      ) : (
        <div className="mt-4 space-y-2">
          {pending.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50/60 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/40"
            >
              <p className="text-xs">
                <span className="font-medium">{c.counterparty?.name}</span>{" "}
                <span className="text-muted">quiere comprar tu producción</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void respond(c.id, "accept")}
                  disabled={busy}
                  className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background"
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  onClick={() => void respond(c.id, "decline")}
                  disabled={busy}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

export function WalletCard({
  walletAddress,
  walletVerifiedAt,
  className,
}: {
  walletAddress: string | null;
  walletVerifiedAt: string | null;
  className?: string;
}) {
  const { wallet, signMessage } = useWallet();
  const { cluster } = useCluster();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function linkWallet() {
    if (!wallet || !signMessage) return;

    setBusy(true);
    setError(null);

    try {
      const challengeResponse = await fetch("/api/companies/wallet/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: wallet.account.address }),
      });
      const challenge = (await challengeResponse.json().catch(() => null)) as {
        message?: string;
        nonce?: string;
        error?: string;
      } | null;

      if (!challengeResponse.ok || !challenge?.message || !challenge.nonce) {
        throw new Error(
          challenge?.error ?? "No se pudo iniciar la vinculación."
        );
      }

      const signature = await signMessage(
        new TextEncoder().encode(challenge.message)
      );
      const signatureBase58 = getBase58Decoder().decode(signature);

      const linkResponse = await fetch("/api/companies/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nonce: challenge.nonce,
          wallet_address: wallet.account.address,
          signature: signatureBase58,
        }),
      });
      const linked = (await linkResponse.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!linkResponse.ok) {
        throw new Error(linked?.error ?? "No se pudo vincular la wallet.");
      }

      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        /reject|cancel|denied/i.test(message)
          ? "Cancelaste la firma."
          : message || "No se pudo vincular la wallet."
      );
      setBusy(false);
      return;
    }

    setBusy(false);
  }

  return (
    <section className={`${CARD} ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Wallet</h2>
        {walletAddress ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            Verificada
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            Pendiente
          </span>
        )}
      </div>

      {walletAddress ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs leading-relaxed text-muted">
            Wallet verificada. Queda fija como la wallet de tu empresa.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-full bg-secondary px-3 py-1 text-xs text-foreground">
              {ellipsify(walletAddress, 6)}
            </code>
            <a
              href={getExplorerUrl(`/address/${walletAddress}`, cluster)}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
            >
              Ver en Explorer
            </a>
          </div>
          {walletVerifiedAt && (
            <p className="text-xs text-muted">
              Verificada el{" "}
              {new Date(walletVerifiedAt).toLocaleDateString("es-AR", {
                dateStyle: "long",
              })}
            </p>
          )}
          {wallet && wallet.account.address !== walletAddress && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              La wallet conectada ({ellipsify(wallet.account.address, 6)}) no es
              la verificada.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-2 space-y-3">
          <p className="text-xs leading-relaxed text-muted">
            Firmá un mensaje con la wallet de tu empresa para probar que te
            pertenece. La verificación es única y no se puede cambiar.
          </p>
          {!wallet && <WalletButton />}
          {wallet && !signMessage && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Esta wallet no permite firmar mensajes. Probá con Phantom o
              Solflare.
            </p>
          )}
          {wallet && signMessage && (
            <button
              type="button"
              onClick={() => void linkWallet()}
              disabled={busy}
              className="btn-primary rounded-full px-4"
            >
              {busy ? "Esperando la firma…" : "Firmar y vincular wallet"}
            </button>
          )}
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
