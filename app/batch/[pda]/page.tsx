import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  LotMetrics,
  StatusBadge,
  dateFmt,
} from "../../explorer/components/lot-display";
import { PassportQr } from "../../components/passport-qr";
import { plantCertificateUrl } from "../../explorer/data/lots";
import { ellipsify, getExplorerUrl } from "../../lib/explorer";
import { getPassportRecord, type PassportLot } from "../data/passport";
import { CertificateVerification } from "./certificate-verification";
import { RecordContrast } from "./record-contrast";

type PassportParams = { pda: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PassportParams>;
}): Promise<Metadata> {
  const { pda } = await params;
  const record = await getPassportRecord(pda);
  if (!record) notFound();
  return {
    title: `Lote ${record.lot.lot_id} · Pasaporte JuLit`,
    description: `Registro público del lote ${record.lot.lot_id} de Li₂CO₃: origen, métricas declaradas y certificación de planta.`,
  };
}

function TxLink({ label, signature }: { label: string; signature: string }) {
  return (
    <a
      href={getExplorerUrl(`/tx/${signature}`, "devnet")}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-brand-700 underline underline-offset-2"
    >
      {label} <span className="font-mono">{ellipsify(signature)}</span>
    </a>
  );
}

type TimelineEvent = {
  label: string;
  signature: string;
  tone: "neutral" | "dispute" | "settled" | "cancelled";
};

/**
 * The lot's lifecycle as the index observed it, in on-chain order:
 * creation (the Digital Title minted into escrow), funding, an optional
 * dispute flag, and exactly one terminal event — redemption, timeout
 * claim, or cancellation. A lot that is disputed and later redeemed
 * shows both events.
 */
function lifecycleTimeline(lot: PassportLot): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      label: "Creación — Título Digital emitido al escrow",
      signature: lot.creation_tx_signature,
      tone: "neutral",
    },
  ];
  if (lot.fund_tx_signature)
    events.push({
      label: "Fondeo — USDC depositado en escrow",
      signature: lot.fund_tx_signature,
      tone: "neutral",
    });
  if (lot.dispute_tx_signature)
    events.push({
      label: "Disputa — pago congelado por la compradora",
      signature: lot.dispute_tx_signature,
      tone: "dispute",
    });
  if (lot.redeem_tx_signature)
    events.push({
      label: "Liquidación — recepción confirmada, escrow liberado",
      signature: lot.redeem_tx_signature,
      tone: "settled",
    });
  if (lot.claim_tx_signature)
    events.push({
      label: "Cobro por timeout — la productora reclamó el escrow",
      signature: lot.claim_tx_signature,
      tone: "settled",
    });
  if (lot.cancel_tx_signature)
    events.push({
      label: "Cancelación — reserva liberada, título quemado",
      signature: lot.cancel_tx_signature,
      tone: "cancelled",
    });
  return events;
}

const TONE_DOT: Record<TimelineEvent["tone"], string> = {
  neutral: "bg-muted",
  dispute: "bg-amber-500",
  settled: "bg-emerald-500",
  cancelled: "bg-foreground/40",
};

/**
 * Public passport: the lot's product record from the public index. No
 * session, no wallet, no 3D — the Explorer links stay pinned to Devnet
 * regardless of the visitor's catalogue cluster.
 */
export default async function LotPassportPage({
  params,
}: {
  params: Promise<PassportParams>;
}) {
  const { pda } = await params;
  const record = await getPassportRecord(pda);
  if (!record) notFound();
  const { lot, origin } = record;

  const certificate = plantCertificateUrl(lot);
  const addressUrl = getExplorerUrl(`/address/${lot.pda_address}`, "devnet");
  const mintUrl = getExplorerUrl(`/address/${lot.mint_address}`, "devnet");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-2xl px-6 py-4">
        <Link href="/explorer" className="text-sm font-bold tracking-tight">
          JuLit
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-16">
        <p className="eyebrow">Pasaporte de lote</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground">
            {lot.lot_id}
          </h1>
          <StatusBadge status={lot.status} />
        </div>
        <p className="mt-2 text-sm text-muted">
          {origin.salar} · {origin.producer}
        </p>

        <div className="mt-6 space-y-6">
          <section aria-labelledby="passport-metrics">
            <h2 id="passport-metrics" className="eyebrow">
              Métricas declaradas
            </h2>
            <div className="mt-2">
              <LotMetrics lot={lot} origin={origin} />
            </div>
          </section>

          <section aria-labelledby="passport-certification">
            <h2 id="passport-certification" className="eyebrow">
              Certificación de planta
            </h2>
            <div className="mt-2 space-y-3">
              <p className="rounded-xl border border-border bg-card px-3.5 py-3 text-[11px] leading-snug text-muted">
                La productora declaró el certificado de su planta al crear el
                lote. El SHA-256 del PDF quedó grabado en la cuenta del lote;
                podés contrastarlo con el documento.
              </p>
              <div className="space-y-2 rounded-xl border border-border bg-card px-3.5 py-3 text-[11px] text-muted">
                <p>
                  <a
                    href={certificate}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-brand-700 underline underline-offset-2"
                  >
                    Certificado de planta (PDF)
                  </a>
                </p>
                <p>
                  SHA-256 declarado:{" "}
                  <span className="font-mono text-foreground/75">
                    {lot.plant_cert_sha256.slice(0, 8)}…
                    {lot.plant_cert_sha256.slice(-6)}
                  </span>
                </p>
                <CertificateVerification
                  certificateUrl={certificate}
                  recordedHex={lot.plant_cert_sha256}
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="passport-escrow">
            <h2 id="passport-escrow" className="eyebrow">
              Liquidación en escrow
            </h2>
            <div className="mt-2 space-y-1.5 rounded-xl border border-border bg-card px-3.5 py-3 text-[11px] text-muted">
              <p>
                El Título Digital del lote es un NFT custodiado por la propia
                cuenta del lote hasta que la liquidación lo queme.
              </p>
              <p>
                Comprador designado:{" "}
                <span className="font-mono text-foreground/75">
                  {ellipsify(lot.buyer_wallet, 6)}
                </span>
              </p>
              <p>
                Reclamable por la productora desde el{" "}
                <span className="text-foreground/75">
                  {dateFmt.format(new Date(lot.claimable_after))}
                </span>{" "}
                si el comprador no confirma la recepción.
              </p>
              <p className="flex flex-wrap gap-x-4 gap-y-1">
                <a
                  href={mintUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-700 underline underline-offset-2"
                >
                  Título Digital{" "}
                  <span className="font-mono">
                    {ellipsify(lot.mint_address)}
                  </span>
                </a>
              </p>
            </div>
          </section>

          <section aria-labelledby="passport-provenance">
            <h2 id="passport-provenance" className="eyebrow">
              Procedencia
            </h2>
            <div className="mt-2 space-y-1.5 rounded-xl border border-border bg-card px-3.5 py-3 text-[11px] text-muted">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span>
                  Indexado el{" "}
                  <span className="text-foreground/75">
                    {dateFmt.format(new Date(lot.indexed_at))}
                  </span>
                </span>
                <span>Solana Devnet</span>
              </div>
              <p className="font-mono break-all">{lot.pda_address}</p>
              <p>
                <a
                  href={addressUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-700 underline underline-offset-2"
                >
                  Dirección en Explorer
                </a>
              </p>
              <ol
                aria-label="Línea de vida del lote"
                className="ml-1 space-y-2 border-l border-border pl-3"
              >
                {lifecycleTimeline(lot).map((event) => (
                  <li
                    key={event.signature}
                    className="flex items-baseline gap-2"
                  >
                    <span
                      aria-hidden
                      className={`inline-block h-1.5 w-1.5 shrink-0 -translate-y-0.5 rounded-full ${TONE_DOT[event.tone]}`}
                    />
                    <TxLink label={event.label} signature={event.signature} />
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section aria-labelledby="passport-contrast">
            <h2 id="passport-contrast" className="eyebrow">
              Contraste con Solana
            </h2>
            <RecordContrast lot={lot} />
          </section>

          <section aria-labelledby="passport-share">
            <h2 id="passport-share" className="eyebrow">
              Compartir
            </h2>
            <div className="mt-2 rounded-xl border border-border bg-card px-4 py-5">
              <PassportQr pda={lot.pda_address} batchId={lot.lot_id} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
