import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BatchFindings,
  BatchMetrics,
  StatusBadge,
  dateFmt,
} from "../../batches/components/batch-display";
import { ThemeToggle } from "../../components/theme-toggle";
import { ellipsify, getExplorerUrl } from "../../lib/explorer";
import { getPassportRecord } from "../data/passport";

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
    title: `Lote ${record.batch.batch_id} · Pasaporte JuLit`,
    description: `Registro público del lote ${record.batch.batch_id} de Li₂CO₃: origen, métricas declaradas y certificación.`,
  };
}

/**
 * Public passport: the batch's product record from the public index. No
 * session, no wallet, no 3D — the Explorer links stay pinned to Devnet
 * regardless of the visitor's catalogue cluster.
 */
export default async function BatchPassportPage({
  params,
}: {
  params: Promise<PassportParams>;
}) {
  const { pda } = await params;
  const record = await getPassportRecord(pda);
  if (!record) notFound();
  const { batch, origin } = record;

  const addressUrl = getExplorerUrl(`/address/${batch.pda_address}`, "devnet");
  const creationTxUrl = getExplorerUrl(
    `/tx/${batch.creation_tx_signature}`,
    "devnet"
  );

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
            {batch.batch_id}
          </h1>
          <StatusBadge status={batch.status} />
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
              <BatchMetrics batch={batch} origin={origin} />
            </div>
          </section>

          <section aria-labelledby="passport-certification">
            <h2 id="passport-certification" className="eyebrow">
              Certificación
            </h2>
            {batch.status === "created" ? (
              <div className="mt-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-4 dark:border-amber-800 dark:bg-amber-950/40">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Certificación pendiente
                </p>
                <p className="mt-1 text-[11px] leading-snug text-amber-800 dark:text-amber-300">
                  Este lote todavía no fue auditado: no hay hallazgos ni
                  certificado.
                </p>
              </div>
            ) : (
              <div className="mt-2">
                <BatchFindings batch={batch} />
              </div>
            )}
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
                    {dateFmt.format(new Date(batch.indexed_at))}
                  </span>
                </span>
                <span>Solana Devnet</span>
              </div>
              <p className="font-mono break-all">{batch.pda_address}</p>
              <p className="flex flex-wrap gap-x-4 gap-y-1">
                <a
                  href={addressUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-400"
                >
                  Dirección en Explorer
                </a>
                <a
                  href={creationTxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-400"
                >
                  Transacción de creación{" "}
                  <span className="font-mono">
                    {ellipsify(batch.creation_tx_signature)}
                  </span>
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
