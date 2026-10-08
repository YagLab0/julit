"use client";

import { useCallback, useEffect, useState } from "react";
import { address } from "@solana/kit";
import { fetchMaybeLot, findLotPda } from "../../generated/julit";
import { Chip } from "../../explorer/components/lot-display";
import { createSolanaClient } from "../../lib/solana-client";
import {
  contrastLotRecord,
  type ContrastField,
  type IndexedLot,
} from "../verification";

type ContrastState =
  | { status: "checking" }
  | { status: "verified" }
  | { status: "mismatch"; fields: readonly ContrastField[] }
  | { status: "missing" }
  | { status: "unavailable" };

const FIELD_LABELS: Record<ContrastField, string> = {
  pda: "dirección del lote (PDA)",
  programAddress: "programa",
  lotId: "identificador del lote",
  producer: "productor",
  buyer: "comprador designado",
  mint: "título digital",
  origin: "origen",
  volume: "volumen",
  purity: "pureza",
  water: "huella hídrica",
  carbon: "huella de carbono",
  specSheetHash: "ficha técnica del lote",
  status: "estado",
};

function ContrastCard({
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
      ? "border-emerald-300 bg-emerald-50/60 text-emerald-900"
      : "border-amber-300 bg-amber-50/60 text-amber-900";
  return (
    <div className={`mt-2 rounded-xl border px-4 py-4 ${classes}`}>
      <p className="text-xs font-semibold">{title}</p>
      {children}
    </div>
  );
}

/**
 * On-chain record contrast: after first paint the island derives the lot
 * PDA, reads the account on Devnet and renders the explicit verdict. A
 * failure or an absent account never renders as verified (ADR-0011).
 */
export function RecordContrast({ lot }: { lot: IndexedLot }) {
  const [state, setState] = useState<ContrastState>({ status: "checking" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        const [derivedPda] = await findLotPda({
          producer: address(lot.producer_wallet),
          lotId: lot.lot_id,
        });
        const { rpc } = createSolanaClient("devnet");
        const account = await fetchMaybeLot(rpc, derivedPda, {
          commitment: "confirmed",
        });
        if (!active) return;

        const verdict = contrastLotRecord({
          indexed: lot,
          derivedPda,
          account: account.exists
            ? { programAddress: account.programAddress, data: account.data }
            : null,
        });
        setState(
          verdict.state === "verified"
            ? { status: "verified" }
            : verdict.state === "missing"
              ? { status: "missing" }
              : { status: "mismatch", fields: verdict.fields }
        );
      } catch {
        if (active) setState({ status: "unavailable" });
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [lot, attempt]);

  const retry = useCallback(() => {
    setState({ status: "checking" });
    setAttempt((n) => n + 1);
  }, []);

  // One persistent live region: every state — checking included — is
  // announced as it lands instead of rendering under a different node each
  // time (user story 35).
  return (
    <div role="status">
      {state.status === "checking" && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-4 text-[11px] text-muted">
          <span
            aria-hidden
            className="h-3 w-3 animate-spin rounded-full border border-border border-t-brand-600"
          />
          Consultando el registro en Solana Devnet…
        </div>
      )}

      {state.status === "verified" && (
        <ContrastCard tone="good" title="Registro verificado en Solana">
          <p className="mt-1 text-[11px] leading-snug">
            La cuenta on-chain del lote coincide campo por campo con el registro
            indexado.
          </p>
        </ContrastCard>
      )}

      {state.status === "missing" && (
        <ContrastCard
          tone="warn"
          title="La cuenta del lote no existe en Solana"
        >
          <p className="mt-1 text-[11px] leading-snug">
            No hay una cuenta del programa JuLit en la dirección derivada para
            este lote en Devnet.
          </p>
        </ContrastCard>
      )}

      {state.status === "mismatch" && (
        <ContrastCard
          tone="warn"
          title="El registro indexado difiere de la cuenta on-chain"
        >
          <p className="mt-1 text-[11px] leading-snug">Campos que difieren:</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {state.fields.map((field) => (
              <Chip key={field} tone="warn">
                {FIELD_LABELS[field]}
              </Chip>
            ))}
          </div>
        </ContrastCard>
      )}

      {state.status === "unavailable" && (
        <ContrastCard tone="warn" title="No se pudo consultar Solana Devnet">
          <p className="mt-1 text-[11px] leading-snug">
            El contraste con la cuenta on-chain no está disponible ahora.
          </p>
          <button type="button" onClick={retry} className="btn-secondary mt-3">
            Reintentar
          </button>
        </ContrastCard>
      )}
    </div>
  );
}
