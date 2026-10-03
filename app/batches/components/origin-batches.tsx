"use client";

import { useOriginBatches } from "../data/use-origin-batches";
import { NoLotes } from "./assets-panel";
import { BatchCard } from "./batch-card";
import { Skeleton } from "./batch-display";

/** Batch index section for one origin: loading, retry, honest empty or cards. */
export function OriginBatches({ originId }: { originId: string }) {
  const { state, retry } = useOriginBatches(originId);

  if (state.status === "loading") {
    return (
      <div role="status" aria-busy="true" className="space-y-3">
        <span className="sr-only">Cargando los lotes…</span>
        <div aria-hidden className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
        <p role="alert" className="text-xs font-medium text-foreground">
          No se pudieron cargar los lotes.
        </p>
        <button type="button" onClick={retry} className="btn-secondary mt-3">
          Reintentar
        </button>
      </div>
    );
  }

  if (state.batches.length === 0) return <NoLotes />;

  return (
    <div className="space-y-3">
      {state.batches.map((batch) => (
        <BatchCard key={batch.pda_address} batch={batch} />
      ))}
    </div>
  );
}
