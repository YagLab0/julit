"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
