import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  LotMetrics,
  StatusBadge,
  dateFmt,
} from "../../batches/components/lot-display";
import { PassportQr } from "../../components/passport-qr";
import { ThemeToggle } from "../../components/theme-toggle";
import { plantCertificateUrl } from "../../batches/data/lots";
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
      className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-400"
    >
      {label} <span className="font-mono">{ellipsify(signature)}</span>
    </a>
  );
}

/** The on-chain transitions the index has observed for this lot. */
function transitionLinks(lot: PassportLot) {
  const links: { label: string; signature: string }[] = [
    { label: "Creación", signature: lot.creation_tx_signature },
  ];
  if (lot.fund_tx_signature)
    links.push({ label: "Fondeo", signature: lot.fund_tx_signature });
  if (lot.dispute_tx_signature)
    links.push({ label: "Disputa", signature: lot.dispute_tx_signature });
  if (lot.redeem_tx_signature)
    links.push({ label: "Liquidación", signature: lot.redeem_tx_signature });
  if (lot.claim_tx_signature)
    links.push({
      label: "Cobro por timeout",
      signature: lot.claim_tx_signature,
    });
  if (lot.cancel_tx_signature)
    links.push({ label: "Cancelación", signature: lot.cancel_tx_signature });
  return links;
}

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
      <header className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-6 py-4">
        <Link href="/batches" className="text-sm font-bold tracking-tight">
          JuLit
        </Link>
        <ThemeToggle />
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
                    className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-400"
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
                  className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-400"
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
              <p className="flex flex-wrap gap-x-4 gap-y-1">
                <a
                  href={addressUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-400"
                >
                  Dirección en Explorer
                </a>
                {transitionLinks(lot).map((t) => (
                  <TxLink
                    key={t.label}
                    label={t.label}
                    signature={t.signature}
                  />
                ))}
              </p>
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
