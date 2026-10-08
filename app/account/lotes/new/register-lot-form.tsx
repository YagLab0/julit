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
} from "../../../generated/julit";
import { Field } from "../../../components/form-field";
import { ellipsify, getExplorerUrl } from "../../../lib/explorer";
import { useSendTransaction } from "../../../lib/hooks/use-send-transaction";
import { useWallet } from "../../../lib/wallet/context";
import { createSolanaClient } from "../../../lib/solana-client";
import {
  findMasterEditionPda,
  findMetadataPda,
} from "../../../lib/solana/metaplex";
import { useCluster } from "../../../components/cluster-context";
import { decimalFmt } from "../../../explorer/components/lot-display";
import type { ProducerInfo } from "./new-lot-client";
import {
  validateLotForm,
  type LotFormValues,
  type FieldKey,
  type FieldErrors,
} from "./validation";
import { useAccountDict } from "../../i18n/context";
import { t } from "../../i18n";

const INPUT_CLASS =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";

export type Counterparty = { name: string; wallet: string };

const INITIAL: LotFormValues = {
  lotId: "",
  volumeTonnes: "",
  priceUsdc: "",
  buyerWallet: "",
  specSheetSha256: "",
};

type SpecUpload =
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
  const dict = useAccountDict();
  const f = dict.newLot.form;
  const [values, setValues] = useState<LotFormValues>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [indexing, setIndexing] = useState(false);
  const [spec, setSpec] = useState<SpecUpload>({ status: "idle" });

  const update = (key: FieldKey) => (v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  /** Uploads the PDF first: the server recomputes the digest and stores the
   *  file content-addressed, so the hash declared on-chain provably matches
   *  the stored spec sheet. */
  const handleSpecSheet = async (file: File | null) => {
    if (!file) {
      setSpec({ status: "idle" });
      setValues((prev) => ({ ...prev, specSheetSha256: "" }));
      return;
    }
    setSpec({ status: "uploading" });
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/companies/spec-sheet", {
        method: "POST",
        body: form,
      });
      const body = (await res.json().catch(() => null)) as {
        digest?: string;
        path?: string;
        error?: string;
      } | null;
      if (!res.ok || !body?.digest || !body.path) {
        throw new Error(body?.error ?? f.specUploadError);
      }
      setSpec({ status: "ready", digest: body.digest, path: body.path });
      setValues((prev) => ({ ...prev, specSheetSha256: body.digest! }));
      setErrors((prev) =>
        prev.specSheetSha256 ? { ...prev, specSheetSha256: undefined } : prev
      );
    } catch (err) {
      setSpec({ status: "failed" });
      setValues((prev) => ({ ...prev, specSheetSha256: "" }));
      toast.error(err instanceof Error ? err.message : f.specUploadFailed);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) {
      toast.error(f.connectToast);
      return;
    }
    const { errors, payload } = validateLotForm(
      values,
      {
        producerWallet: producer.walletAddress,
        originId: producer.originId,
        producerSpecs: producer.specs,
        contractedBuyers: buyers.map((b) => b.wallet),
      },
      dict.newLot.validation
    );
    setErrors(errors);
    if (!payload) {
      toast.error(f.reviewFields);
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
        specSheetHash: hexToBytes(payload.specSheetSha256),
        metadataUri: "",
      });

      const txSignature = await send({ instructions: [instruction] });

      // From here the transaction is on-chain: a failure means it did not
      // index, not that it did not land. The endpoint re-verifies the same
      // signature, so a failed POST is safe to retry from the toast.
      const explorerAction = {
        label: dict.common.viewTx,
        onClick: () =>
          window.open(getExplorerUrl(`/tx/${txSignature}`, cluster), "_blank"),
      };

      const indexAndReport = async (): Promise<boolean> => {
        const response = await fetch("/api/lots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tx_signature: txSignature }),
        }).catch(() => null);

        if (response?.ok) return true;

        const body = response
          ? ((await response.json().catch(() => null)) as {
              error?: string;
            } | null)
          : null;
        toast.error(f.notIndexed, {
          description: body?.error ?? f.notIndexedDesc,
          action: {
            label: f.retry,
            onClick: () => void retryIndex(),
          },
          cancel: explorerAction,
        });
        return false;
      };

      const onIndexed = () => {
        toast.success(t(f.published, { lot: payload.lotId }), {
          description: f.publishedDesc,
          action: explorerAction,
        });
        setValues(INITIAL);
        setSpec({ status: "idle" });
      };

      const retryIndex = async () => {
        setIndexing(true);
        const ok = await indexAndReport();
        setIndexing(false);
        if (ok) onIndexed();
      };

      setIndexing(true);
      const ok = await indexAndReport();
      setIndexing(false);
      if (ok) onIndexed();
    } catch (err) {
      setIndexing(false);
      const message = err instanceof Error ? err.message : "";
      if (/reject|cancel|denied/i.test(message)) {
        toast.error(dict.common.cancelled);
      } else {
        toast.error(f.submitError, {
          description: message || dict.common.unexpected,
        });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6">
      <div className="rounded-3xl bg-card p-6">
        <p className="eyebrow">{f.identification}</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label={f.lotIdLabel} hint={f.lotIdHint} error={errors.lotId}>
            <input
              className={INPUT_CLASS}
              value={values.lotId}
              onChange={(e) => update("lotId")(e.target.value)}
              placeholder={f.lotIdPlaceholder}
              maxLength={64}
            />
          </Field>
          <Field label={f.originLabel} hint={f.originHint}>
            <p className="rounded-xl bg-secondary px-3 py-2 text-sm font-medium">
              {producer.originName}
            </p>
          </Field>
          <Field
            label={f.volumeLabel}
            hint={f.volumeHint}
            error={errors.volumeTonnes}
          >
            <input
              className={INPUT_CLASS}
              inputMode="numeric"
              value={values.volumeTonnes}
              onChange={(e) => update("volumeTonnes")(e.target.value)}
              placeholder={f.volumePlaceholder}
            />
          </Field>
          <Field
            label={f.priceLabel}
            hint={f.priceHint}
            error={errors.priceUsdc}
          >
            <input
              className={INPUT_CLASS}
              inputMode="decimal"
              value={values.priceUsdc}
              onChange={(e) => update("priceUsdc")(e.target.value)}
              placeholder={f.pricePlaceholder}
            />
          </Field>
          <Field
            label={f.specsLabel}
            hint={f.specsHint}
            error={errors.producerSpecs}
            span
          >
            <p className="rounded-xl bg-secondary px-3 py-2 text-sm font-medium">
              {t(f.specsValue, {
                purity: decimalFmt.format(Number(producer.specs.purityPct)),
                water: decimalFmt.format(
                  Number(producer.specs.waterM3PerTonne)
                ),
                carbon: decimalFmt.format(
                  Number(producer.specs.carbonKgCo2ePerTonne)
                ),
              })}
            </p>
          </Field>
          <Field
            label={f.buyerLabel}
            hint={buyers.length > 0 ? f.buyerHintAvailable : f.buyerHintEmpty}
            error={errors.buyerWallet}
            span
          >
            <select
              className={INPUT_CLASS}
              value={values.buyerWallet}
              onChange={(e) => update("buyerWallet")(e.target.value)}
            >
              <option value="" disabled>
                {f.buyerPlaceholder}
              </option>
              {buyers.map((b) => (
                <option key={b.wallet} value={b.wallet}>
                  {b.name} · {ellipsify(b.wallet, 4)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={f.specLabel}
            hint={f.specHint}
            error={errors.specSheetSha256}
            span
          >
            <input
              type="file"
              accept="application/pdf"
              className={`${INPUT_CLASS} file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs file:font-semibold`}
              onChange={(e) =>
                void handleSpecSheet(e.target.files?.[0] ?? null)
              }
            />
            {spec.status === "uploading" && (
              <p className="mt-1 text-[11px] text-muted">{f.specUploading}</p>
            )}
            {spec.status === "ready" && (
              <p className="mt-1 font-mono text-[11px] text-muted">
                SHA-256: {spec.digest.slice(0, 12)}…{spec.digest.slice(-8)}
              </p>
            )}
          </Field>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {t(f.signAs, { name: producer.name })}{" "}
          <span className="font-mono">
            {ellipsify(producer.walletAddress, 4)}
          </span>
        </p>
        <div className="flex gap-2">
          <Link
            href="/account/lotes"
            className="btn-secondary rounded-full px-4"
          >
            {f.back}
          </Link>
          <button
            type="submit"
            disabled={isSending || indexing || spec.status === "uploading"}
            className="btn-primary rounded-full px-5"
          >
            {isSending
              ? dict.common.signing
              : indexing
                ? dict.common.indexing
                : f.submit}
          </button>
        </div>
      </div>
    </form>
  );
}
