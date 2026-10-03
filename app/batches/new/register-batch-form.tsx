"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ellipsify } from "../../lib/explorer";
import { ORIGINS } from "./origins";
import {
  validateBatchForm,
  type BatchFormValues,
  type FieldKey,
} from "./validation";

const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";

const INITIAL: BatchFormValues = {
  batchId: "",
  originId: ORIGINS[0].id,
  volumeTonnes: "",
  purityPct: "",
  waterM3PerTonne: "",
  carbonKgCo2ePerTonne: "",
  priceUsdc: "",
  auditorWallet: "",
  reservedBuyerWallet: "",
};

function Field({
  label,
  hint,
  error,
  span = false,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  span?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${span ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-semibold text-foreground/80">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-destructive">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function RegisterBatchForm({
  producerWallet,
}: {
  producerWallet: string;
}) {
  const [values, setValues] = useState<BatchFormValues>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const update = (key: FieldKey) => (v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { errors, payload } = validateBatchForm(values, producerWallet);
    setErrors(errors);
    if (!payload) {
      toast.error("Revisá los campos marcados.");
      return;
    }
    // The on-chain create_batch instruction lands with the Anchor program.
    console.info("create_batch payload", payload);
    toast.success(`Lote ${payload.batchId} validado`, {
      description:
        "La transacción on-chain se habilita con el programa Anchor.",
    });
  };

  const isReserved = values.reservedBuyerWallet.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="eyebrow">Identificación</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field
            label="Identificador de lote"
            hint="Único por productora. Ej.: LIT-2026-EXAR-02"
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
          <Field label="Origen" error={errors.originId}>
            <select
              className={INPUT_CLASS}
              value={values.originId}
              onChange={(e) => update("originId")(e.target.value)}
            >
              {ORIGINS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Wallet del auditor designado"
            hint="Laboratorio que certificará el lote."
            error={errors.auditorWallet}
            span
          >
            <input
              className={`${INPUT_CLASS} font-mono`}
              value={values.auditorWallet}
              onChange={(e) => update("auditorWallet")(e.target.value)}
              placeholder="Base58, 32–44 caracteres"
              spellCheck={false}
            />
          </Field>
          <Field
            label="Wallet del comprador reservado (opcional)"
            hint={
              isReserved
                ? "Lote reservado: solo ese comprador podrá adquirirlo."
                : "Vacío = lote spot, disponible para cualquier comprador."
            }
            error={errors.reservedBuyerWallet}
            span
          >
            <input
              className={`${INPUT_CLASS} font-mono`}
              value={values.reservedBuyerWallet}
              onChange={(e) => update("reservedBuyerWallet")(e.target.value)}
              placeholder="Base58, 32–44 caracteres"
              spellCheck={false}
            />
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
          Firma como productora:{" "}
          <span className="font-mono">{ellipsify(producerWallet, 4)}</span>
        </p>
        <div className="flex gap-2">
          <Link href="/batches" className="btn-secondary">
            Volver al catálogo
          </Link>
          <button type="submit" className="btn-primary">
            Registrar lote
          </button>
        </div>
      </div>
    </form>
  );
}
