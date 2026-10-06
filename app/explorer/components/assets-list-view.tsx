"use client";

import type { Origin } from "../data/origins";
import { OriginReference } from "./assets-panel";
import { OriginBatches } from "./origin-batches";

/**
 * List view without the map: fallback if WebGL fails on the demo machine
 * and an accessible option (everything keyboard + screen-reader friendly).
 */
export function AssetsListView({ origins }: { origins: Origin[] }) {
  return (
    <div className="absolute inset-0 overflow-y-auto px-4 pt-[calc(var(--explorer-chrome,3.5rem)+1rem)] pb-28">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Orígenes
            </h1>
            <p className="text-sm text-muted">
              Carbonato de litio de la Puna jujeña: fichas y referencias
              públicas
            </p>
          </div>
        </div>

        {origins.map((origin) => (
          <section
            key={origin.id}
            aria-labelledby={`origin-${origin.id}`}
            className="mt-8"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h2
                  id={`origin-${origin.id}`}
                  className="text-lg font-bold tracking-tight text-foreground"
                >
                  {origin.name}
                </h2>
                <p className="text-sm text-muted">
                  {origin.producer} · {origin.salar}
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-[280px_1fr]">
              <OriginReference origin={origin} />
              <div>
                <OriginBatches originId={origin.id} />
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
