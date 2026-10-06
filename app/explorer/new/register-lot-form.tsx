"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { address } from "@solana/kit";
import {
  fetchConfig,
  findConfigPda,
  findLotPda,
  findMintPda,
  getCreateLotInstructionAsync,
} from "../../generated/julit";
import { Field } from "../../components/form-field";
import { ellipsify, getExplorerUrl } from "../../lib/explorer";
import { useSendTransaction } from "../../lib/hooks/use-send-transaction";
import { useWallet } from "../../lib/wallet/context";
import { createSolanaClient } from "../../lib/solana-client";
import {
  findMasterEditionPda,
  findMetadataPda,
} from "../../lib/solana/metaplex";
import { useCluster } from "../../components/cluster-context";
import type { ProducerInfo } from "./new-lot-client";
import {
  validateLotForm,
  type LotFormValues,
  type FieldKey,
} from "./validation";

const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";

export type Counterparty = { name: string; wallet: string };

const INITIAL: LotFormValues = {
  lotId: "",
  volumeTonnes: "",
  purityPct: "",
  waterM3PerTonne: "",
  carbonKgCo2ePerTonne: "",
  priceUsdc: "",
  buyerWallet: "",
  claimableAfter: "",
  plantCertSha256: "",
};

type CertUpload =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "ready"; digest: string; path: string }
  | { status: "failed" };

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function RegisterLotForm({
  producer,
  buyers,
}: {
  producer: ProducerInfo;
  buyers: Counterparty[];
}) {
  const { signer } = useWallet();
  const { cluster } = useCluster();
  const { send, isSending } = useSendTransaction();
  const [values, setValues] = useState<LotFormValues>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [indexing, setIndexing] = useState(false);
  const [cert, setCert] = useState<CertUpload>({ status: "idle" });

  const update = (key: FieldKey) => (v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  /** Uploads the PDF first: the server recomputes the digest and stores the
   *  file content-addressed, so the hash declared on-chain provably matches
   *  the stored certificate. */
  const handleCertificate = async (file: File | null) => {
    if (!file) {
      setCert({ status: "idle" });
      setValues((prev) => ({ ...prev, plantCertSha256: "" }));
      return;
    }
    setCert({ status: "uploading" });
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/companies/plant-certificate", {
        method: "POST",
        body: form,
      });
      const body = (await res.json().catch(() => null)) as {
        digest?: string;
        path?: string;
        error?: string;
      } | null;
      if (!res.ok || !body?.digest || !body.path) {
        throw new Error(body?.error ?? "Error al subir el certificado.");
      }
      setCert({ status: "ready", digest: body.digest, path: body.path });
      setValues((prev) => ({ ...prev, plantCertSha256: body.digest! }));
      setErrors((prev) =>
        prev.plantCertSha256 ? { ...prev, plantCertSha256: undefined } : prev
      );
    } catch (err) {
      setCert({ status: "failed" });
      setValues((prev) => ({ ...prev, plantCertSha256: "" }));
      toast.error(
        err instanceof Error ? err.message : "No se pudo subir el certificado."
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) {
      toast.error("Conectá la wallet verificada para firmar.");
      return;
    }
    const { errors, payload } = validateLotForm(values, {
      producerWallet: producer.walletAddress,
      originId: producer.originId,
      contractedBuyers: buyers.map((b) => b.wallet),
      nowUnixSeconds: Math.floor(Date.now() / 1000),
    });
    setErrors(errors);
    if (!payload) {
      toast.error("Revisá los campos marcados.");
      return;
    }

    try {
      const { rpc } = createSolanaClient("devnet");
      const [configPda] = await findConfigPda();
      const config = await fetchConfig(rpc, configPda, {
        commitment: "confirmed",
      });
      const [lotPda] = await findLotPda({
        producer: address(payload.producerWallet),
        lotId: payload.lotId,
      });
      const [mint] = await findMintPda({ lot: lotPda });
      const [metadata] = await findMetadataPda(mint);
      const [masterEdition] = await findMasterEditionPda(mint);

      const instruction = await getCreateLotInstructionAsync({
        producer: signer,
        usdcMint: config.data.usdcMint,
        metadata,
        masterEdition,
        lotId: payload.lotId,
        originId: payload.originId,
        volumeTonnes: BigInt(payload.volumeTonnes),
        purityBasisPoints: BigInt(payload.purityBasisPoints),
        waterM3PerTonneScaled: BigInt(payload.waterM3PerTonneScaled),
        carbonKgCo2ePerTonneScaled: BigInt(payload.carbonKgCo2ePerTonneScaled),
        priceUsdc: BigInt(payload.priceUsdcScaled),
        buyer: address(payload.buyerWallet),
        claimableAfter: BigInt(payload.claimableAfterUnix),
        plantCertHash: hexToBytes(payload.plantCertSha256),
        metadataUri: "",
      });

      const txSignature = await send({ instructions: [instruction] });

      setIndexing(true);
      const response = await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_signature: txSignature }),
      });
      setIndexing(false);

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error("El lote quedó on-chain pero no se indexó", {
          description: body?.error ?? "Reintentá la indexación más tarde.",
          action: {
            label: "Ver transacción",
            onClick: () =>
              window.open(
                getExplorerUrl(`/tx/${txSignature}`, cluster),
                "_blank"
              ),
          },
        });
        return;
      }

      toast.success(`Lote ${payload.lotId} publicado`, {
        description:
          "La transacción quedó confirmada e indexada como publicada.",
        action: {
          label: "Ver transacción",
          onClick: () =>
            window.open(
              getExplorerUrl(`/tx/${txSignature}`, cluster),
              "_blank"
            ),
        },
      });
      setValues(INITIAL);
      setCert({ status: "idle" });
    } catch (err) {
      setIndexing(false);
      const message = err instanceof Error ? err.message : "";
      if (/reject|cancel|denied/i.test(message)) {
        toast.error("Cancelaste la firma.");
      } else {
        toast.error("No se pudo registrar el lote.", {
          description: message || "Error inesperado.",
        });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="eyebrow">Identificación</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field
            label="Identificador de lote"
            hint="Único por productora. Ej.: LIT-2026-PBL-02"
            error={errors.lotId}
          >
            <input
              className={INPUT_CLASS}
              value={values.lotId}
              onChange={(e) => update("lotId")(e.target.value)}
              placeholder="LIT-2026-OLZ-05"
              maxLength={64}
            />
          </Field>
          <Field label="Origen" hint="Del perfil de tu empresa.">
            <p className="rounded-lg border border-border-low bg-cream/50 px-3 py-2 text-sm font-medium">
              {producer.originName}
            </p>
          </Field>
          <Field
            label="Comprador designado"
            hint={
              buyers.length > 0
                ? "Solo esta empresa podrá fondear el escrow del lote."
                : "No tenés compradores con contrato aceptado."
            }
            error={errors.buyerWallet}
            span
          >
            <select
              className={INPUT_CLASS}
              value={values.buyerWallet}
              onChange={(e) => update("buyerWallet")(e.target.value)}
            >
              <option value="" disabled>
                Elegí un comprador…
              </option>
              {buyers.map((b) => (
                <option key={b.wallet} value={b.wallet}>
                  {b.name} · {ellipsify(b.wallet, 4)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Reclamable desde"
            hint="Si el comprador no confirma la recepción antes de esta fecha, podés reclamar los fondos del escrow."
            error={errors.claimableAfter}
            span
          >
            <input
              type="datetime-local"
              className={INPUT_CLASS}
              value={values.claimableAfter}
              onChange={(e) => update("claimableAfter")(e.target.value)}
            />
          </Field>
          <Field
            label="Certificado de planta (PDF)"
            hint="Se guarda direccionado por contenido; el SHA-256 queda declarado en el lote."
            error={errors.plantCertSha256}
            span
          >
            <input
              type="file"
              accept="application/pdf"
              className={`${INPUT_CLASS} file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs file:font-semibold`}
              onChange={(e) =>
                void handleCertificate(e.target.files?.[0] ?? null)
              }
            />
            {cert.status === "uploading" && (
              <p className="mt-1 text-[11px] text-muted">
                Subiendo y calculando el SHA-256…
              </p>
            )}
            {cert.status === "ready" && (
              <p className="mt-1 font-mono text-[11px] text-muted">
                SHA-256: {cert.digest.slice(0, 12)}…{cert.digest.slice(-8)}
              </p>
            )}
          </Field>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-6">
        <p className="eyebrow">Producción y sostenibilidad</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field
            label="Volumen (toneladas)"
            hint="Toneladas enteras de Li₂CO₃."
            error={errors.volumeTonnes}
          >
            <input
              className={INPUT_CLASS}
              inputMode="numeric"
              value={values.volumeTonnes}
              onChange={(e) => update("volumeTonnes")(e.target.value)}
              placeholder="420"
            />
          </Field>
          <Field
            label="Pureza química (%)"
            hint="Grado batería: 99,50–100,00 con hasta 2 decimales."
            error={errors.purityPct}
          >
            <input
              className={INPUT_CLASS}
              inputMode="decimal"
              value={values.purityPct}
              onChange={(e) => update("purityPct")(e.target.value)}
              placeholder="99.55"
            />
          </Field>
          <Field
            label="Huella hídrica (m³/t)"
            hint="Hasta 2 decimales."
            error={errors.waterM3PerTonne}
          >
            <input
              className={INPUT_CLASS}
              inputMode="decimal"
              value={values.waterM3PerTonne}
              onChange={(e) => update("waterM3PerTonne")(e.target.value)}
              placeholder="50.80"
            />
          </Field>
          <Field
            label="Huella de carbono (kg CO₂e/t)"
            hint="Hasta 2 decimales."
            error={errors.carbonKgCo2ePerTonne}
          >
            <input
              className={INPUT_CLASS}
              inputMode="decimal"
              value={values.carbonKgCo2ePerTonne}
              onChange={(e) => update("carbonKgCo2ePerTonne")(e.target.value)}
              placeholder="8200.00"
            />
          </Field>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-6">
        <p className="eyebrow">Comercial</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field
            label="Precio del lote (USDC)"
            hint="Cotización total del lote, hasta 6 decimales. El comprador la deposita entera en el escrow."
            error={errors.priceUsdc}
          >
            <input
              className={INPUT_CLASS}
              inputMode="decimal"
              value={values.priceUsdc}
              onChange={(e) => update("priceUsdc")(e.target.value)}
              placeholder="12000.123456"
            />
          </Field>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Firma como {producer.name}:{" "}
          <span className="font-mono">
            {ellipsify(producer.walletAddress, 4)}
          </span>
        </p>
        <div className="flex gap-2">
          <Link href="/explorer" className="btn-secondary">
            Volver al catálogo
          </Link>
          <button
            type="submit"
            disabled={isSending || indexing || cert.status === "uploading"}
            className="btn-primary"
          >
            {isSending
              ? "Firmando…"
              : indexing
                ? "Indexando…"
                : "Registrar lote"}
          </button>
        </div>
      </div>
    </form>
  );
}
