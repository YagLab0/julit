"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { buildContractAgreementMessage } from "../lib/contracts";

export type AccountCompany = {
  name: string;
  companyType: CompanyType;
  walletAddress: string | null;
  walletVerifiedAt: string | null;
  originId: string | null;
};

export type AcquiredBatch = {
  batch_id: string;
  pda_address: string;
  volume_tonnes: number;
  purity_pct: number;
  price_usdc: number;
  completion_tx_signature: string;
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
  revoked: "border-border-low bg-secondary text-muted",
};

type ContractRow = {
  id: string;
  status: "pending" | "accepted" | "revoked";
  initiator_signature?: string | null;
  counterparty_signature?: string | null;
  respondedAt?: string | null;
  createdAt?: string;
  producer?: {
    id: string;
    name: string;
    company_type?: CompanyType;
    wallet_address?: string;
    origin_id?: string;
  } | null;
  counterparty?: {
    id: string;
    name: string;
    company_type?: CompanyType;
    wallet_address?: string;
  } | null;
  role?: "producer" | "counterparty";
  posture?: "initiator" | "responder" | null;
};

const NEXT_STEPS: Record<
  CompanyType,
  { title: string; body: string; href?: string; linkLabel?: string }
> = {
  producer: {
    title: "Registrar lotes",
    body: "Creá un lote con sus métricas de producción y sostenibilidad, elegí el auditor designado y, opcionalmente, reservalo para un cliente.",
    href: "/batches/new",
    linkLabel: "Registrar lote",
  },
  auditor: {
    title: "Certificar lotes",
    body: "Subí el certificado de auditoría y declará los hallazgos ESG y de la regulación europea de tus lotes asignados.",
    href: "/audit",
    linkLabel: "Certificar lotes",
  },
  buyer: {
    title: "Comprar lotes",
    body: "Mientras llega la compra simulada, podés explorar el catálogo público de lotes auditados.",
    href: "/batches",
    linkLabel: "Ver catálogo",
  },
};

export function AccountClient({
  email,
  company,
  acquiredBatches = [],
}: {
  email: string;
  company: AccountCompany;
  acquiredBatches?: AcquiredBatch[];
}) {
  const nextStep = NEXT_STEPS[company.companyType];

  return (
    <div className="space-y-6">
      <section>
        <p className="eyebrow">{COMPANY_TYPE_LABELS[company.companyType]}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {company.name}
        </h1>
        <p className="mt-1 text-xs text-muted">Cuenta: {email}</p>
        {company.companyType === "producer" && company.originId && (
          <p className="mt-1 text-xs text-muted">
            Origen: {originName(company.originId)}
          </p>
        )}
      </section>

      <WalletCard
        walletAddress={company.walletAddress}
        walletVerifiedAt={company.walletVerifiedAt}
      />

      {company.companyType === "buyer" && (
        <>
          <BuyerPortfolioCard batches={acquiredBatches} />
          <BuyerContractsCard />
        </>
      )}

      {company.companyType !== "buyer" && (
        <ContractsCard companyType={company.companyType} />
      )}

      {company.companyType === "producer" && <BuyerOffersCard />}

      <section className="rounded-2xl border border-border-low bg-card p-5">
        <h2 className="text-sm font-semibold">{nextStep.title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          {nextStep.body}
        </p>
        {nextStep.href && (
          <Link
            href={nextStep.href}
            className="btn-secondary mt-3 inline-block"
          >
            {nextStep.linkLabel}
          </Link>
        )}
      </section>
    </div>
  );
}

function BuyerPortfolioCard({ batches }: { batches: AcquiredBatch[] }) {
  const { cluster } = useCluster();
  const totalVolume = batches.reduce(
    (sum, b) => sum + Number(b.volume_tonnes || 0),
    0
  );
  const totalUsdc = batches.reduce(
    (sum, b) => sum + Number(b.price_usdc || 0),
    0
  );

  return (
    <section className="rounded-2xl border border-border-low bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">
            Portafolio de Lotes Adquiridos
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Lotes adjudicados a tu empresa mediante liquidación simulada en
            Devnet.
          </p>
        </div>
        <span className="font-mono text-xs text-muted">
          {batches.length} {batches.length === 1 ? "lote" : "lotes"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border-low bg-secondary/50 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Volumen total
          </p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
            {totalVolume.toLocaleString("es-AR")}{" "}
            <span className="text-xs font-normal text-muted">t</span>
          </p>
        </div>
        <div className="rounded-xl border border-border-low bg-secondary/50 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Inversión total
          </p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
            {totalUsdc.toLocaleString("es-AR")}{" "}
            <span className="text-xs font-normal text-muted">USDC</span>
          </p>
        </div>
        <div className="rounded-xl border border-border-low bg-secondary/50 p-3 col-span-2 sm:col-span-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Liquidación
          </p>
          <p className="mt-1 text-xs font-semibold text-brand-700 dark:text-brand-400">
            Simulada en Devnet
          </p>
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border-low p-6 text-center">
          <p className="text-xs font-medium text-muted">
            Tu empresa todavía no tiene lotes adquiridos.
          </p>
          <p className="mt-1 text-xs text-muted">
            Navegá el catálogo de lotes auditados para iniciar la compra
            simulada.
          </p>
          <Link
            href="/batches"
            className="btn-primary mt-3 inline-block text-xs"
          >
            Ir al catálogo
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {batches.map((batch) => (
            <div
              key={batch.batch_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-low bg-background p-3 text-sm"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-foreground">
                    {batch.batch_id}
                  </span>
                  <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-medium text-brand-700 dark:text-brand-400">
                    Completado
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {batch.volume_tonnes} t ·{" "}
                  {Number(batch.purity_pct).toFixed(2)} % Li₂CO₃ · Origen:{" "}
                  {originName(batch.origin_id)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/batch/${batch.pda_address || batch.batch_id}`}
                  className="btn-secondary text-xs px-2.5 py-1.5"
                >
                  Ver Pasaporte
                </Link>
                {batch.completion_tx_signature && (
                  <a
                    href={getExplorerUrl(
                      `/tx/${batch.completion_tx_signature}`,
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

function BuyerContractsCard() {
  const { wallet, signMessage } = useWallet();
  const { send: sendTransaction } = useSendTransaction();
  const { cluster } = useCluster();
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
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

  async function loadContracts() {
    try {
      const res = await fetch("/api/companies/contracts");
      if (res.ok) {
        const data = await res.json();
        setContracts(data.contracts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadContracts();
  }, []);

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
      void loadContracts();
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

  return (
    <section className="rounded-2xl border border-border-low bg-card p-5">
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
          className="btn-secondary text-xs px-3 py-1.5 cursor-pointer"
        >
          + Solicitar contrato
        </button>
      </div>

      {showModal && (
        <div className="mt-4 rounded-xl border border-brand-500/30 bg-brand-50/40 dark:bg-brand-950/20 p-4">
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
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
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
              className="btn-primary text-xs px-4 py-2 cursor-pointer"
            >
              {requesting
                ? "Firmando solicitud…"
                : "Firmar y solicitar con wallet"}
            </button>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-secondary text-xs px-3 py-2 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="text-xs text-muted">Cargando contratos…</p>
        ) : contracts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-low p-6 text-center">
            <p className="text-xs text-muted">
              Tu empresa todavía no tiene contratos comerciales registrados.
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Podés solicitar acuerdos desde el catálogo de lotes o con el botón
              superior.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {contracts.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-low bg-background p-3.5 text-xs"
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
                            href={getExplorerUrl(`/tx/${c.initiator_signature}`, cluster)}
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
                          href={getExplorerUrl(`/tx/${c.counterparty_signature}`, cluster)}
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

function ContractsCard({ companyType }: { companyType: CompanyType }) {
  const [contracts, setContracts] = useState<ContractRow[] | null>(null);
  const [directory, setDirectory] = useState<
    { id: string; name: string }[] | null
  >(null);
  const [counterpartyId, setCounterpartyId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const isProducer = companyType === "producer";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/companies/contracts")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { contracts?: ContractRow[] } | null) => {
        if (!cancelled) setContracts(data?.contracts ?? []);
      })
      .catch(() => {
        if (!cancelled) setContracts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    if (!isProducer) return;
    let cancelled = false;
    fetch("/api/companies/directory?type=auditor")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { companies?: { id: string; name: string }[] } | null) => {
        if (!cancelled) setDirectory(data?.companies ?? []);
      })
      .catch(() => {
        if (!cancelled) setDirectory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [reload, isProducer]);

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
    setReload((n) => n + 1);
  }

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
    setReload((n) => n + 1);
  }

  const pendingIncoming = (contracts ?? []).filter(
    (c) => !isProducer && c.posture === "responder" && c.status === "pending"
  );

  return (
    <section className="rounded-2xl border border-border-low bg-card p-5">
      <h2 className="text-sm font-semibold">
        {isProducer
          ? "Contratos de auditoría"
          : "Contratos con productoras"}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        {isProducer
          ? "Ofrecé un contrato a una auditora para poder asignarla a tus lotes."
          : "Aceptá contratos de productoras para certificar sus lotes."}
      </p>

      {isProducer && (
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
            disabled={busy || directory === null}
            aria-label="Auditora"
            className="rounded-lg border border-border-low bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="">Elegir auditora…</option>
            {(directory ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy || !counterpartyId}
            className="btn-primary"
          >
            {busy ? "Enviando…" : "Ofrecer contrato"}
          </button>
        </form>
      )}

      {pendingIncoming.length > 0 && (
        <div className="mt-4 space-y-2">
          {pendingIncoming.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50/60 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/40"
            >
              <p className="text-xs">
                <span className="font-medium">{c.producer?.name}</span>{" "}
                <span className="text-muted">te ofrece un contrato</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void respond(c.id, "accept")}
                  disabled={busy}
                  className="rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background"
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  onClick={() => void respond(c.id, "decline")}
                  disabled={busy}
                  className="rounded-md border border-border-low px-2.5 py-1 text-xs font-medium text-muted"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {contracts !== null && contracts.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {contracts.map((c) => {
            const other = c.role === "producer" ? c.counterparty : c.producer;
            return (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border-low px-3 py-2"
              >
                <p className="text-xs">
                  <span className="font-medium">{other?.name}</span>{" "}
                  <span className="text-muted">
                    (
                    {COMPANY_TYPE_LABELS[
                      other?.company_type ?? "auditor"
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

      {contracts !== null && contracts.length === 0 && (
        <p className="mt-3 text-xs text-muted">Todavía no hay contratos.</p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

function BuyerOffersCard() {
  const [offers, setOffers] = useState<ContractRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/companies/contracts")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { contracts?: ContractRow[] } | null) => {
        if (!cancelled) setOffers(data?.contracts ?? []);
      })
      .catch(() => {
        if (!cancelled) setOffers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

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
    setReload((n) => n + 1);
  }

  const pending = (offers ?? []).filter(
    (c) => c.posture === "responder" && c.status === "pending"
  );

  return (
    <section className="rounded-2xl border border-border-low bg-card p-5">
      <h2 className="text-sm font-semibold">Ofertas de compradoras</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Las compradoras te ofrecen contratos para reservar tus lotes. Aceptalas
        para habilitarlas como clientes.
      </p>

      {offers === null ? (
        <p className="mt-3 text-xs text-muted">Cargando ofertas…</p>
      ) : pending.length === 0 ? (
        <p className="mt-3 text-xs text-muted">
          No hay ofertas pendientes de compradoras.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {pending.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50/60 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/40"
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
                  className="rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background"
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  onClick={() => void respond(c.id, "decline")}
                  disabled={busy}
                  className="rounded-md border border-border-low px-2.5 py-1 text-xs font-medium text-muted"
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

function WalletCard({
  walletAddress,
  walletVerifiedAt,
}: {
  walletAddress: string | null;
  walletVerifiedAt: string | null;
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
    <section className="rounded-2xl border border-border-low bg-card p-5">
      <h2 className="text-sm font-semibold">Wallet</h2>

      {walletAddress ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs leading-relaxed text-muted">
            Wallet verificada. Queda fija como la wallet de tu empresa.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-md border border-border-low bg-secondary px-2 py-1 text-xs text-foreground">
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
              className="btn-primary"
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
