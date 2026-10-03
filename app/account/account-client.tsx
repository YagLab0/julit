"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getBase58Decoder } from "@solana/kit";
import { COMPANY_TYPE_LABELS, type CompanyType } from "../lib/company";
import { originName } from "../lib/origins";
import { ellipsify, getExplorerUrl } from "../lib/explorer";
import { useWallet } from "../lib/wallet/context";
import { useCluster } from "../components/cluster-context";
import { WalletButton } from "../components/wallet-button";

export type AccountCompany = {
  name: string;
  companyType: CompanyType;
  walletAddress: string | null;
  walletVerifiedAt: string | null;
  originId: string | null;
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
}: {
  email: string;
  company: AccountCompany;
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

      <ContractsCard companyType={company.companyType} />
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
  respondedAt: string | null;
  createdAt: string;
  producer: { id: string; name: string; company_type: CompanyType } | null;
  counterparty: { id: string; name: string; company_type: CompanyType } | null;
  role: "producer" | "counterparty";
  posture: "initiator" | "responder" | null;
};

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
      <h2 className="text-sm font-semibold">Contratos comerciales</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        {isProducer
          ? "Ofrecé contratos a auditoras. Solo las auditoras que acepten aparecen como opciones al registrar un lote."
          : "Las productoras te ofrecen contratos comerciales. Aceptalos para aparecer como auditora designada o cliente de sus lotes."}
      </p>

      {isProducer && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={counterpartyId}
            onChange={(event) => setCounterpartyId(event.target.value)}
            className="rounded-lg border border-border-low bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="">
              {directory === null
                ? "Cargando auditoras…"
                : directory.length === 0
                  ? "Sin auditoras registradas"
                  : "Elegí una auditora…"}
            </option>
            {(directory ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void offerContract()}
            disabled={busy || !counterpartyId}
            className="btn-primary"
          >
            {busy ? "Enviando…" : "Ofrecer contrato"}
          </button>
        </div>
      )}

      {pendingIncoming.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-foreground/80">
            Ofertas pendientes
          </p>
          {pendingIncoming.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50/60 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/40"
            >
              <p className="text-xs">
                <span className="font-medium">{c.producer?.name}</span>{" "}
                <span className="text-muted">
                  quiere contratarte como{" "}
                  {COMPANY_TYPE_LABELS[
                    c.counterparty?.company_type ?? "auditor"
                  ].toLowerCase()}
                </span>
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
                      : " · oferta enviada"})
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
        Las compradoras te ofrecen contratos para reservar tus lotes.
        Aceptalas para habilitarlas como clientes.
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
                <span className="text-muted">
                  quiere comprar tu producción
                </span>
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
