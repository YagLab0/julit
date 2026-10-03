"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { ThemeToggle } from "../components/theme-toggle";
import { SessionMenu } from "../components/session-menu";
import { createClient } from "../lib/supabase/client";
import { MapLayersPanel, type LayerState } from "./components/map-layers-panel";
import type { Basemap } from "./components/map-style";
import type { MapStatus } from "./components/region-map";
import { AssetsListView } from "./components/assets-list-view";
import { OriginModal } from "./components/origin-modal";
import { ORIGIN_COLUMNS, type Origin } from "./data/origins";

// MapLibre + WebGPU only exist in the browser.
const RegionMap = dynamic(
  () => import("./components/region-map").then((m) => m.RegionMap),
  { ssr: false }
);

type View = "map" | "list";
type CatalogueStatus = "loading" | "error" | "ready";

function ViewToggle({
  view,
  onChange,
  mapDisabled,
}: {
  view: View;
  onChange: (view: View) => void;
  mapDisabled: boolean;
}) {
  const options: { value: View; label: string }[] = [
    { value: "map", label: "Mapa" },
    { value: "list", label: "Lista" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Vista"
      className="flex rounded-lg border border-border bg-card p-0.5 shadow-sm"
    >
      {options.map((option) => {
        const disabled = option.value === "map" && mapDisabled;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={view === option.value}
            disabled={disabled}
            title={
              disabled
                ? "El mapa 3D no está disponible en este navegador"
                : undefined
            }
            onClick={() => onChange(option.value)}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${view === option.value ? "bg-primary text-primary-foreground" : "text-foreground/75 hover:bg-accent"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted">
        <span
          aria-hidden
          className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand-600"
        />
        <p className="text-xs font-medium" role="status">
          Cargando el relieve de la Puna jujeña…
        </p>
      </div>
    </div>
  );
}

/** Catalogue fetch states: full-screen, keyboard- and screen-reader friendly. */
function CatalogueStatusOverlay({
  status,
  onRetry,
}: {
  status: CatalogueStatus;
  onRetry: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-background px-6">
      {status === "loading" ? (
        <div className="flex flex-col items-center gap-3 text-muted">
          <span
            aria-hidden
            className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand-600"
          />
          <p className="text-xs font-medium" role="status">
            Cargando los orígenes…
          </p>
        </div>
      ) : (
        <div
          role="alert"
          className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
        >
          <p className="text-sm font-semibold text-foreground">
            No se pudieron cargar los orígenes.
          </p>
          <p className="mt-1 text-xs text-muted">
            Revisá tu conexión e intentá de nuevo.
          </p>
          <button type="button" onClick={onRetry} className="btn-primary mt-4">
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}

function IntroTitle({
  visible,
  showSkip,
  onSkip,
}: {
  visible: boolean;
  showSkip: boolean;
  onSkip: () => void;
}) {
  return (
    <div
      aria-hidden={!visible}
      className={`pointer-events-none absolute inset-x-0 top-[13%] z-10 flex flex-col items-center px-6 text-center transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-700 dark:text-brand-400">
        JuLit · Demo visual
      </p>
      <h1 className="mt-2 max-w-2xl text-4xl font-bold tracking-tight text-foreground [text-shadow:0_1px_12px_rgba(255,255,255,0.9)]">
        Litio trazable de la Puna jujeña
      </h1>
      <p className="mt-3 text-sm font-medium text-foreground/75 [text-shadow:0_1px_8px_rgba(255,255,255,0.9)]">
        Elegí un origen para ver su ficha
      </p>
      {showSkip && (
        <button
          type="button"
          onClick={onSkip}
          tabIndex={visible ? 0 : -1}
          className="pointer-events-auto mt-5 cursor-pointer rounded-full border border-border bg-card/90 px-4 py-1.5 text-xs font-semibold text-foreground/75 shadow-sm backdrop-blur transition hover:bg-card"
        >
          Saltar intro
        </button>
      )}
    </div>
  );
}

export default function JuLitAppPage() {
  // Origins come from the public Supabase `origins` catalogue.
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [catalogueStatus, setCatalogueStatus] =
    useState<CatalogueStatus>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [view, setView] = useState<View>("map");
  const [mapStatus, setMapStatus] = useState<MapStatus>("loading");
  const [skipIntroSignal, setSkipIntroSignal] = useState(0);
  const [titleVisible, setTitleVisible] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layers, setLayers] = useState<LayerState>({
    satellite: false,
    routes: false,
  });
  const { resolvedTheme } = useTheme();

  // No session needed: RLS exposes the catalogue to anonymous reads.
  useEffect(() => {
    let active = true;
    createClient()
      .from("origins")
      .select(ORIGIN_COLUMNS)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Could not load the origins catalogue", error);
          setCatalogueStatus("error");
          return;
        }
        setOrigins((data ?? []) as Origin[]);
        setCatalogueStatus("ready");
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const basemap: Basemap = layers.satellite
    ? "satellite"
    : resolvedTheme === "dark"
      ? "dark"
      : "light";

  const selectedOrigin = origins.find((o) => o.id === selectedId) ?? null;

  const handleStatus = useCallback((status: MapStatus) => {
    setMapStatus(status);
    if (status === "error") {
      setView("list");
      toast.warning("El mapa 3D no está disponible", {
        description: "Mostramos los orígenes en lista.",
      });
    }
  }, []);

  useEffect(() => {
    if (mapStatus !== "ready") return;
    const timer = setTimeout(() => setTitleVisible(false), 1800);
    return () => clearTimeout(timer);
  }, [mapStatus]);

  const handleSelect = useCallback((id: string | null) => {
    setTitleVisible(false);
    setSelectedId(id);
  }, []);

  const ready = catalogueStatus === "ready";
  const mapAvailable = mapStatus !== "error";
  const showMap = ready && view === "map" && mapAvailable;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background text-foreground">
      {showMap && (
        <RegionMap
          origins={origins}
          selectedId={selectedId}
          onSelect={handleSelect}
          onStatusChange={handleStatus}
          skipIntroSignal={skipIntroSignal}
          basemap={basemap}
          showRoutes={layers.routes}
        />
      )}

      {showMap && mapStatus === "loading" && <LoadingOverlay />}
      {showMap && mapStatus !== "loading" && (
        <IntroTitle
          visible={titleVisible && !selectedId}
          showSkip={mapStatus === "intro"}
          onSkip={() => setSkipIntroSignal((n) => n + 1)}
        />
      )}

      {showMap && mapStatus !== "loading" && (
        <div className="pointer-events-none absolute top-24 left-4 z-20">
          <MapLayersPanel layers={layers} onChange={setLayers} />
        </div>
      )}

      {ready && view === "list" && <AssetsListView origins={origins} />}

      {catalogueStatus !== "ready" && (
        <CatalogueStatusOverlay
          status={catalogueStatus}
          onRetry={() => {
            setCatalogueStatus("loading");
            setReloadKey((n) => n + 1);
          }}
        />
      )}

      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto rounded-2xl border border-border bg-card/90 px-4 py-3 shadow-sm backdrop-blur">
          <Link
            href="/"
            className="text-sm font-bold tracking-tight text-foreground"
          >
            JuLit
          </Link>
          <p className="text-xs text-muted">Demo visual · Puna jujeña</p>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <Link href="/batches/new" className="btn-secondary">
            Registrar lote
          </Link>
          <SessionMenu />
          <ViewToggle
            view={view}
            onChange={setView}
            mapDisabled={!mapAvailable}
          />
          <ThemeToggle />
        </div>
      </header>

      {ready && (
        <div
          role="note"
          className="absolute bottom-4 left-4 z-10 max-w-xs rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/95 dark:bg-amber-950/60 px-3 py-2 text-[11px] leading-snug text-amber-900 dark:text-amber-200 shadow-sm"
        >
          <p>
            <strong>Datos de referencia pública.</strong> Ubicaciones,
            capacidades y salares: cada origen cita su fuente.
          </p>
        </div>
      )}

      {selectedOrigin && (
        <OriginModal
          key={selectedOrigin.id}
          origin={selectedOrigin}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
