"use client";

import { useCallback, useState } from "react";
import { certificateVerdict } from "../verification";

type VerifyState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "match" }
  | { status: "mismatch" }
  | { status: "failed" };

function VerifyCard({
  tone,
  title,
  children,
}: {
  tone: "good" | "warn";
  title: string;
  children?: React.ReactNode;
}) {
  const classes =
    tone === "good"
      ? "border-emerald-300 bg-emerald-50/60 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
      : "border-amber-300 bg-amber-50/60 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
  return (
    <div className={`rounded-xl border px-4 py-4 ${classes}`}>
      <p className="text-xs font-semibold">{title}</p>
      {children}
    </div>
  );
}

/**
 * Staged certificate verification (ADR-0009): on demand, the visitor's
 * browser downloads the PDF, hashes its bytes and compares them with the
 * digest indexed for the batch. The verdict names its source — the index —
 * and never claims Solana verification. A download failure shows no verdict.
 */
export function CertificateVerification({
  certificateUrl,
  recordedHex,
}: {
  certificateUrl: string;
  recordedHex: string;
}) {
  const [state, setState] = useState<VerifyState>({ status: "idle" });

  const verify = useCallback(async () => {
    setState({ status: "checking" });
    try {
      const res = await fetch(certificateUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = await res.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const hex = [...new Uint8Array(digest)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setState({ status: certificateVerdict(recordedHex, hex) });
    } catch {
      setState({ status: "failed" });
    }
  }, [certificateUrl, recordedHex]);

  if (state.status === "checking") {
    return (
      <div
        role="status"
        className="flex items-center gap-2 text-[11px] text-muted"
      >
        <span
          aria-hidden
          className="h-3 w-3 animate-spin rounded-full border border-border border-t-brand-600"
        />
        Descargando el certificado y calculando su SHA-256…
      </div>
    );
  }

  if (state.status === "match") {
    return (
      <VerifyCard
        tone="good"
        title="El PDF coincide con el digest indexado para este lote"
      >
        <p className="mt-1 text-[11px] leading-snug">
          La verificación en Solana llega con la certificación on-chain.
        </p>
      </VerifyCard>
    );
  }

  if (state.status === "mismatch") {
    return (
      <VerifyCard tone="warn" title="El PDF no coincide con el digest indexado">
        <p className="mt-1 text-[11px] leading-snug">
          Los bytes descargados difieren del SHA-256 registrado para este lote:
          el documento puede estar alterado o desactualizado.
        </p>
      </VerifyCard>
    );
  }

  if (state.status === "failed") {
    return (
      <VerifyCard tone="warn" title="No se pudo descargar el certificado">
        <p className="mt-1 text-[11px] leading-snug">
          Sin el PDF no hay veredicto: intentá de nuevo.
        </p>
        <button
          type="button"
          onClick={() => void verify()}
          className="btn-secondary mt-3"
        >
          Reintentar
        </button>
      </VerifyCard>
    );
  }

  return (
    <button type="button" onClick={() => void verify()} className="btn-primary">
      Verificar certificado
    </button>
  );
}
