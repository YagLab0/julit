"use client";

import { formatNumber } from "../data/points";
import { CORRIDOR_SOURCES, EXPORT_ROUTES } from "../data/points";
import { ROUTE_COLORS } from "./map-style";

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg px-2 py-1.5 transition hover:bg-accent">
      <span>
        <span className="block text-xs font-semibold text-foreground">
          {label}
        </span>
        {hint && <span className="block text-[10px] text-muted">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 cursor-pointer accent-brand-600"
      />
    </label>
  );
}

export type LayerState = {
  satellite: boolean;
  routes: boolean;
};

/** Map layers: satellite base and export routes. No weather/wind layer. */
export function MapLayersPanel({
  layers,
  onChange,
}: {
  layers: LayerState;
  onChange: (layers: LayerState) => void;
}) {
  const set = (patch: Partial<LayerState>) => onChange({ ...layers, ...patch });

  return (
    <div className="pointer-events-auto w-full max-w-64 space-y-2">
      <section
        aria-label="Capas del mapa"
        className="rounded-2xl border border-border bg-card/95 p-2 shadow-sm backdrop-blur"
      >
        <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
          Capas
        </p>
        <Toggle
          label="Satélite"
          hint="Imagen Esri World Imagery"
          checked={layers.satellite}
          onChange={(satellite) => set({ satellite })}
        />
        <Toggle
          label="Rutas de exportación"
          hint="Pacífico y Atlántico, con su fuente"
          checked={layers.routes}
          onChange={(routes) => set({ routes })}
        />
      </section>

      {layers.routes && (
        <section
          aria-label="Rutas de exportación"
          className="rounded-2xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur"
        >
          <p className="text-xs font-bold text-foreground">
            Rutas de exportación
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-muted">
            Las fuentes no coinciden: se muestran las dos.
          </p>
          {(["pacific", "atlantic"] as const).map((corridor) => (
            <div key={corridor} className="mt-2.5">
              <p className="flex items-center gap-2 text-[11px] font-semibold text-foreground">
                <span
                  aria-hidden
                  className="h-1 w-5 rounded-full"
                  style={{ background: ROUTE_COLORS[corridor] }}
                />
                {CORRIDOR_SOURCES[corridor].label}
              </p>
              <ul className="mt-1 space-y-0.5 pl-7 text-[10px] text-muted">
                {EXPORT_ROUTES.filter((r) => r.corridor === corridor).map(
                  (r) => (
                    <li key={r.id}>
                      {r.label}: {formatNumber(r.km)} km · ~
                      {formatNumber(r.hours)} h
                    </li>
                  )
                )}
              </ul>
              <a
                href={CORRIDOR_SOURCES[corridor].source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-block pl-7 text-[10px] text-brand-700 underline underline-offset-2 dark:text-brand-400"
              >
                {CORRIDOR_SOURCES[corridor].source.label}
              </a>
            </div>
          ))}
          <p className="mt-2.5 text-[10px] leading-snug text-muted">
            Trazado y tiempos: OSRM sobre OpenStreetMap (estimación para auto;
            un camión tarda más).
          </p>
        </section>
      )}
    </div>
  );
}
