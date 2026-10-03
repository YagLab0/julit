"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getBase58Decoder } from "@solana/kit";
import { COMPANY_TYPE_LABELS, type CompanyType } from "../lib/company";
import { ORIGINS, originName } from "../lib/origins";
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
    body: "Próximamente vas a poder subir el certificado de auditoría y firmar la certificación de tus lotes asignados.",
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
  const needsOrigin =
    company.companyType === "producer" && company.originId == null;

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

      {needsOrigin && <OriginSetupCard />}

      {company.companyType === "buyer" && (
        <BuyerPortfolioCard batches={acquiredBatches} />
      )}

      {company.companyType !== "buyer" && (
        <section className="rounded-2xl border border-border-low bg-card p-5">
          <h2 className="text-sm font-semibold">{nextStep.title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {nextStep.body}
          </p>
          {nextStep.href && !needsOrigin && (
            <Link
              href={nextStep.href}
              className="btn-secondary mt-3 inline-block"
            >
              {nextStep.linkLabel}
            </Link>
          )}
        </section>
      )}
    </div>
  );
}

function BuyerPortfolioCard({
  batches,
}: {
  batches: AcquiredBatch[];
}) {
  const { cluster } = useCluster();
  const totalVolume = batches.reduce(
    (sum, b) => sum + Number(b.volume_tonnes || 0),
    0
  );

  return (
    <section className="rounded-2xl border border-border-low bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Lotes adquiridos</h2>
          <p className="mt-0.5 text-xs text-muted">
            Portafolio de litio bajo liquidación simulada (ADR-0002).
          </p>
        </div>
        <Link href="/batches" className="btn-secondary text-xs">
          Explorar catálogo
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border-low bg-secondary/50 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Volumen acumulado
          </p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
            {new Intl.NumberFormat("es-AR").format(totalVolume)}{" "}
            <span className="text-xs font-semibold text-muted">t Li₂CO₃</span>
          </p>
        </div>
        <div className="rounded-xl border border-border-low bg-secondary/50 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Lotes completados
          </p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
            {batches.length}
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
            Navegá el catálogo de lotes auditados para iniciar la compra simulada.
          </p>
          <Link href="/batches" className="btn-primary mt-3 inline-block text-xs">
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
                  {batch.volume_tonnes} t · {Number(batch.purity_pct).toFixed(2)} % Li₂CO₃ · Origen: {originName(batch.origin_id)}
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
                    href={getExplorerUrl(`/tx/${batch.completion_tx_signature}`, cluster)}
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

function OriginSetupCard() {
  const router = useRouter();
  const [originId, setOriginId] = useState<string>(ORIGINS[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveOrigin() {
    setBusy(true);
    setError(null);

    const response = await fetch("/api/companies/origin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin_id: originId }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? "No se pudo asignar el origen.");
      setBusy(false);
      return;
    }

    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50/60 p-5 dark:border-amber-800 dark:bg-amber-950/40">
      <h2 className="text-sm font-semibold">Origen de producción</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Tu empresa productora todavía no tiene origen asignado. Elegilo una vez:
        queda fijo y es el origen de todos tus lotes.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={originId}
          onChange={(event) => setOriginId(event.target.value)}
          className="rounded-lg border border-border-low bg-background px-3 py-2 text-sm text-foreground"
        >
          {ORIGINS.map((origin) => (
            <option key={origin.id} value={origin.id}>
              {origin.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void saveOrigin()}
          disabled={busy}
          className="btn-primary"
        >
          {busy ? "Asignando…" : "Asignar origen"}
        </button>
      </div>
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
