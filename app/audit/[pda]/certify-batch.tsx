"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { address } from "@solana/kit";
import {
  EuAssessment as OnChainEuAssessment,
  getCertifyBatchInstructionAsync,
} from "../../generated/julit";
import { Field } from "../../components/form-field";
import { useCluster } from "../../components/cluster-context";
import { VerifiedWalletGate } from "../../components/verified-wallet-gate";
import { ellipsify, getExplorerUrl } from "../../lib/explorer";
import { useSendTransaction } from "../../lib/hooks/use-send-transaction";
import { useWallet } from "../../lib/wallet/context";
import { Metric, Findings, numberFmt, percentFmt } from "../batch-display";
import type { AuditorInfo } from "../audit-client";
import type { AuditBatch, EuAssessment } from "../batches";
import {
  CERTIFICATE_MAX_BYTES,
  validateCertifyForm,
  type CertifyFieldErrors,
  type CertifyFormValues,
} from "../validation";

const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs file:font-medium placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";

function FieldsetField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-xs font-semibold text-foreground/80">
        {label}
      </legend>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-destructive">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </fieldset>
  );
}

async function sha256Hex(file: File): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

type SubmitStep = "upload" | "sign" | "index";

const STEP_LABEL: Record<SubmitStep, string> = {
  upload: "Subiendo…",
  sign: "Firmando…",
  index: "Indexando…",
};

function CertifyForm({
  batch,
  auditor,
}: {
  batch: AuditBatch;
  auditor: AuditorInfo;
}) {
  const router = useRouter();
  const { signer } = useWallet();
  const { cluster } = useCluster();
  const { send, isSending } = useSendTransaction();
  const [file, setFile] = useState<File | null>(null);
  const [digest, setDigest] = useState<string | null>(null);
  const [hashing, setHashing] = useState(false);
  const [esgApproved, setEsgApproved] = useState<boolean | null>(null);
  const [euAssessment, setEuAssessment] = useState<EuAssessment | null>(null);
  const [errors, setErrors] = useState<CertifyFieldErrors>({});
  const [step, setStep] = useState<SubmitStep | null>(null);

  const clearError = (key: keyof CertifyFieldErrors) =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0] ?? null;
    setFile(next);
    setDigest(null);
    clearError("certificate");
    if (!next) return;

    // Reject before reading the file into memory.
    if (next.type !== "application/pdf") {
      setErrors((prev) => ({
        ...prev,
        certificate: "El certificado debe ser un PDF.",
      }));
      return;
    }
    if (next.size > CERTIFICATE_MAX_BYTES) {
      setErrors((prev) => ({
        ...prev,
        certificate: "El certificado supera el máximo de 50 MiB.",
      }));
      return;
    }

    setHashing(true);
    try {
      setDigest(await sha256Hex(next));
    } catch {
      setErrors((prev) => ({
        ...prev,
        certificate: "No se pudo calcular el digest del archivo.",
      }));
    } finally {
      setHashing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step) return;

    const values: CertifyFormValues = {
      fileType: file?.type ?? null,
      fileSizeBytes: file?.size ?? null,
      digest,
      esgApproved,
      euAssessment,
    };
    const { errors, payload } = validateCertifyForm(values);
    setErrors(errors);
    if (!payload || !file) {
      toast.error("Revisá los campos marcados.");
      return;
    }
    if (!signer || signer.address !== auditor.walletAddress) {
      toast.error("Conectá la wallet verificada para firmar.");
      return;
    }

    try {
      // 1. Upload the certificate; the server digest is the on-chain hash.
      setStep("upload");
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch(
        `/api/batches/${batch.pdaAddress}/certificate`,
        { method: "POST", body: form }
      );
      const uploadBody = (await uploadRes.json().catch(() => null)) as {
        digest?: string;
        error?: string;
      } | null;
      if (!uploadRes.ok || !uploadBody?.digest) {
        toast.error("No se pudo subir el certificado.", {
          description: uploadBody?.error ?? "Reintentá más tarde.",
        });
        return;
      }

      // 2. Sign and send certify_batch with the verified auditor wallet.
      setStep("sign");
      const instruction = await getCertifyBatchInstructionAsync({
        batch: address(batch.pdaAddress),
        auditor: signer,
        auditHash: hexToBytes(uploadBody.digest),
        esgApproved: payload.esgApproved,
        euAssessment:
          payload.euAssessment === "conformant"
            ? OnChainEuAssessment.Conformant
            : OnChainEuAssessment.NonConformant,
      });
      const txSignature = await send({ instructions: [instruction] });

      // 3. Index only after the transaction confirmed on-chain.
      setStep("index");
      const indexRes = await fetch(`/api/batches/${batch.pdaAddress}/certify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: txSignature }),
      });
      if (!indexRes.ok) {
        const indexBody = (await indexRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error("El lote quedó certificado on-chain pero no se indexó", {
          description: indexBody?.error ?? "Reintentá la indexación.",
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

      toast.success(`Lote ${batch.batchId} certificado`, {
        description: "La certificación quedó confirmada e indexada.",
        action: {
          label: "Ver transacción",
          onClick: () =>
            window.open(
              getExplorerUrl(`/tx/${txSignature}`, cluster),
              "_blank"
            ),
        },
      });
      router.push("/audit");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (step === "sign" && /reject|cancel|denied/i.test(message)) {
        toast.error("Cancelaste la firma.");
      } else {
        toast.error(
          step === "upload"
            ? "No se pudo subir el certificado."
            : "No se pudo certificar el lote.",
          { description: message || "Error inesperado." }
        );
      }
    } finally {
      setStep(null);
    }
  };

  const ready =
    digest !== null && esgApproved !== null && euAssessment !== null;

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="eyebrow">Lote designado</p>
        <p className="mt-3 text-sm font-semibold">{batch.batchId}</p>
        <p className="mt-0.5 text-xs text-muted">
          {batch.producerName} ·{" "}
          <span className="font-mono">
            {ellipsify(batch.producerWallet, 4)}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-muted">{batch.originName}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Metric
            label="Volumen"
            value={`${numberFmt.format(batch.volumeTonnes)} t`}
          />
          <Metric
            label="Pureza"
            value={`${percentFmt.format(batch.purityPct)}%`}
          />
          <Metric
            label="Huella hídrica"
            value={`${numberFmt.format(batch.waterM3PerTonne)} m³/t`}
          />
          <Metric
            label="Huella carbono"
            value={`${numberFmt.format(batch.carbonKgCo2ePerTonne)} kg/t`}
          />
          <Metric
            label="Precio"
            value={`${numberFmt.format(batch.priceUsdc)} USDC`}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-6">
        <p className="eyebrow">Certificado de auditoría</p>
        <div className="mt-3">
          <Field
            label="Informe (PDF)"
            hint="Un solo informe cubre los hallazgos ESG y la evaluación UE. Máximo 50 MiB."
            error={errors.certificate}
          >
            <input
              type="file"
              accept="application/pdf"
              className={INPUT_CLASS}
              onChange={(e) => void onFileChange(e)}
            />
          </Field>
          {hashing && (
            <p className="mt-2 text-xs text-muted">Calculando SHA-256…</p>
          )}
          {digest && (
            <p className="mt-2 text-xs text-muted">
              SHA-256: <span className="font-mono break-all">{digest}</span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-6">
        <p className="eyebrow">Declaraciones</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <FieldsetField
            label="Certificación ESG"
            hint="Tu evaluación de la evidencia ambiental, social y de gobernanza."
            error={errors.esgApproved}
          >
            <div className="flex gap-4 pt-1">
              {(
                [
                  [true, "Aprobada"],
                  [false, "No aprobada"],
                ] as const
              ).map(([value, label]) => (
                <label key={label} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="esg"
                    className="accent-brand-600"
                    checked={esgApproved === value}
                    onChange={() => {
                      setEsgApproved(value);
                      clearError("esgApproved");
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </FieldsetField>
          <FieldsetField
            label="Evaluación UE 2023/1542"
            hint="Evaluación declarada de los requisitos identificados de la regulación de baterías."
            error={errors.euAssessment}
          >
            <div className="flex gap-4 pt-1">
              {(
                [
                  ["conformant", "Conforme"],
                  ["non_conformant", "No conforme"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="eu"
                    className="accent-brand-600"
                    checked={euAssessment === value}
                    onChange={() => {
                      setEuAssessment(value);
                      clearError("euAssessment");
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </FieldsetField>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Firma como {auditor.name}:{" "}
          <span className="font-mono">
            {ellipsify(auditor.walletAddress, 4)}
          </span>
        </p>
        <div className="flex gap-2">
          <Link href="/audit" className="btn-secondary">
            Volver
          </Link>
          <button
            type="submit"
            className="btn-primary"
            disabled={hashing || !ready || step !== null || isSending}
          >
            {step ? STEP_LABEL[step] : "Certificar lote"}
          </button>
        </div>
      </div>
    </form>
  );
}

export function CertifyBatch({
  batch,
  auditor,
}: {
  batch: AuditBatch | null;
  auditor: AuditorInfo;
}) {
  return (
    <VerifiedWalletGate
      name={auditor.name}
      walletAddress={auditor.walletAddress}
      action="certificar este lote"
      signAs="firmar como auditora"
    >
      {!batch ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted">
            No encontramos un lote designado con esa dirección.
          </p>
          <Link href="/audit" className="btn-secondary mt-4 inline-block">
            Volver a mis lotes
          </Link>
        </div>
      ) : batch.status !== "created" ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{batch.batchId}</p>
              <p className="mt-0.5 text-xs text-muted">
                Este lote ya fue certificado.
              </p>
            </div>
            <Link href="/audit" className="btn-secondary">
              Volver
            </Link>
          </div>
          <Findings batch={batch} />
        </div>
      ) : (
        <CertifyForm batch={batch} auditor={auditor} />
      )}
    </VerifiedWalletGate>
  );
}
