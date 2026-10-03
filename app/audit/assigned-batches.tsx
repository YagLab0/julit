"use client";

import Link from "next/link";
import { ellipsify } from "../lib/explorer";
import { Metric, Findings, numberFmt, percentFmt } from "./batch-display";
import { demoBatches, type DemoBatch } from "./demo-data";

function BatchCard({ batch }: { batch: DemoBatch }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{batch.batchId}</p>
          <p className="mt-0.5 text-xs text-muted">
            {batch.producerName} ·{" "}
            <span className="font-mono">
              {ellipsify(batch.producerWallet, 4)}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted">{batch.originName}</p>
        </div>
        {batch.status === "created" ? (
          <Link href={`/audit/${batch.pdaAddress}`} className="btn-primary">
            Certificar
          </Link>
        ) : (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Certificado
          </span>
        )}
      </div>

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

      {batch.status === "audited" && <Findings batch={batch} />}
    </div>
  );
}

export function AssignedBatches() {
  const pending = demoBatches.filter((b) => b.status === "created");
  const certified = demoBatches.filter((b) => b.status === "audited");

  return (
    <>
      <section className="rounded-2xl border border-border bg-card p-6">
        <p className="eyebrow">Pendientes de certificar</p>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No tenés lotes esperando certificación.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {pending.map((batch) => (
              <BatchCard key={batch.pdaAddress} batch={batch} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <p className="eyebrow">Certificados</p>
        {certified.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Todavía no certificaste ningún lote.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {certified.map((batch) => (
              <BatchCard key={batch.pdaAddress} batch={batch} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
