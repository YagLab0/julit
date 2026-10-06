"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { address } from "@solana/kit";
import { getCreateBatchInstructionAsync } from "../../generated/julit";
import { Field } from "../../components/form-field";
import { ellipsify, getExplorerUrl } from "../../lib/explorer";
import { useSendTransaction } from "../../lib/hooks/use-send-transaction";
import { useWallet } from "../../lib/wallet/context";
import { useCluster } from "../../components/cluster-context";
import type { ProducerInfo } from "./new-batch-client";
import {
  validateBatchForm,
  type BatchFormValues,
  type FieldKey,
} from "./validation";

const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";

export type Counterparty = { name: string; wallet: string };

const INITIAL: BatchFormValues = {
  batchId: "",
  volumeTonnes: "",
  purityPct: "",
  waterM3PerTonne: "",
  carbonKgCo2ePerTonne: "",
  priceUsdc: "",
  auditorWallet: "",
  reservedBuyerWallet: "",
};

export function RegisterBatchForm({
  producer,
  auditors,
  buyers,
}: {
  producer: ProducerInfo;
  auditors: Counterparty[];
  buyers: Counterparty[];
}) {
  const { signer } = useWallet();
  const { cluster } = useCluster();
  const { send, isSending } = useSendTransaction();
  const [values, setValues] = useState<BatchFormValues>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [indexing, setIndexing] = useState(false);

  const update = (key: FieldKey) => (v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) {
      toast.error("Conectá la wallet verificada para firmar.");
      return;
    }
    const { errors, payload } = validateBatchForm(values, {
      producerWallet: producer.walletAddress,
      originId: producer.originId,
      contractedAuditors: auditors.map((a) => a.wallet),
      contractedBuyers: buyers.map((b) => b.wallet),
    });
    setErrors(errors);
    if (!payload) {
      toast.error("Revisá los campos marcados.");
      return;
    }

    try {
      const instruction = await getCreateBatchInstructionAsync({
        producer: signer,
        auditor: address(payload.auditorWallet),
        batchId: payload.batchId,
        originId: payload.originId,
        volumeTonnes: BigInt(payload.volumeTonnes),
        purityBasisPoints: BigInt(payload.purityBasisPoints),
        waterM3PerTonneScaled: BigInt(payload.waterM3PerTonneScaled),
        carbonKgCo2ePerTonneScaled: BigInt(payload.carbonKgCo2ePerTonneScaled),
        priceUsdcScaled: BigInt(payload.priceUsdcScaled),
        reservedBuyer: payload.reservedBuyerWallet
          ? address(payload.reservedBuyerWallet)
          : null,
      });

      const txSignature = await send({ instructions: [instruction] });

      setIndexing(true);
      const response = await fetch("/api/batches", {
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

      toast.success(`Lote ${payload.batchId} registrado`, {
        description: "La transacción quedó confirmada e indexada.",
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

  const isReserved = values.reservedBuyerWallet.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="eyebrow">Identificación</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field
            label="Identificador de lote"
            hint="Único por productora. Ej.: LIT-2026-PBL-02"
            error={errors.batchId}
          >
            <input
              className={INPUT_CLASS}
              value={values.batchId}
              onChange={(e) => update("batchId")(e.target.value)}
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
            label="Auditores contratados"
            hint={
              auditors.length > 0
                ? "Laboratorio que certificará el lote."
                : "No tenés auditores con contrato aceptado."
            }
            error={errors.auditorWallet}
            span
          >
            <select
              className={INPUT_CLASS}
              value={values.auditorWallet}
              onChange={(e) => update("auditorWallet")(e.target.value)}
            >
              <option value="" disabled>
                Elegí un auditor…
              </option>
              {auditors.map((a) => (
                <option key={a.wallet} value={a.wallet}>
                  {a.name} · {ellipsify(a.wallet, 4)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Mis clientes (opcional)"
            hint={
              isReserved
                ? "Lote reservado: solo ese cliente podrá adquirirlo."
                : "Sin cliente = lote spot, disponible para cualquier comprador."
            }
            error={errors.reservedBuyerWallet}
            span
          >
            <select
              className={INPUT_CLASS}
              value={values.reservedBuyerWallet}
              onChange={(e) => update("reservedBuyerWallet")(e.target.value)}
            >
              <option value="">Lote spot (sin comprador reservado)</option>
              {buyers.map((b) => (
                <option key={b.wallet} value={b.wallet}>
                  {b.name} · {ellipsify(b.wallet, 4)}
                </option>
              ))}
            </select>
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
            hint="Cotización total del lote, hasta 6 decimales."
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
            disabled={isSending || indexing}
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
