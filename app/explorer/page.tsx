"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
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
  stretch = false,
}: {
  view: View;
  onChange: (view: View) => void;
  mapDisabled: boolean;
  stretch?: boolean;
}) {
  const options: { value: View; label: string }[] = [
    { value: "map", label: "Mapa" },
    { value: "list", label: "Lista" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Vista"
      className={`flex rounded-lg border border-border bg-card p-0.5 shadow-sm ${stretch ? "w-full" : "shrink-0"}`}
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
            className={`min-h-10 cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-40 lg:min-h-0 ${stretch ? "flex-1" : "shrink-0"} ${view === option.value ? "bg-primary text-primary-foreground" : "text-foreground/75 hover:bg-accent"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

type CatalogFilter = "sale" | "purchased";

function CatalogFilterToggle({
  filter,
  onChange,
  stretch = false,
}: {
  filter: CatalogFilter;
  onChange: (filter: CatalogFilter) => void;
  stretch?: boolean;
}) {
  const options: { value: CatalogFilter; label: string }[] = [
    { value: "sale", label: "En venta" },
    { value: "purchased", label: "Mis compras" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Filtro de lotes"
      className={`flex rounded-lg border border-border bg-card p-0.5 shadow-sm ${stretch ? "w-full" : "shrink-0"}`}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={filter === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-10 cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition lg:min-h-0 ${stretch ? "flex-1" : "shrink-0"} ${
            filter === option.value
              ? "bg-primary text-primary-foreground"
              : "text-foreground/75 hover:bg-accent"
          }`}
        >
          {option.label}
        </button>
      ))}
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
      className={`pointer-events-none absolute inset-x-0 z-10 flex flex-col items-center px-6 text-center transition-opacity duration-700 top-[max(12%,calc(var(--explorer-chrome,3.5rem)+0.75rem))] ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-700 dark:text-brand-400">
        JuLit · Demo visual
      </p>
      <h1 className="mt-2 max-w-2xl text-2xl font-bold tracking-tight text-foreground [text-shadow:0_1px_12px_rgba(255,255,255,0.9)] sm:text-4xl">
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

function ExplorerMenu({
  view,
  onView,
  mapDisabled,
  filter,
  onFilter,
  panelRef,
}: {
  view: View;
  onView: (view: View) => void;
  mapDisabled: boolean;
  filter: CatalogFilter;
  onFilter: (filter: CatalogFilter) => void;
  panelRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={panelRef}
      id="explorer-menu"
      role="dialog"
      aria-label="Opciones"
      tabIndex={-1}
      className="pointer-events-auto absolute inset-x-3 top-[calc(100%+0.5rem)] z-40 animate-fade-in rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur lg:hidden"
    >
      <p className="eyebrow">Vista</p>
      <div className="mt-2">
        <ViewToggle
          stretch
          view={view}
          onChange={onView}
          mapDisabled={mapDisabled}
        />
      </div>
      <p className="eyebrow mt-4">Lotes</p>
      <div className="mt-2">
        <CatalogFilterToggle stretch filter={filter} onChange={onFilter} />
      </div>
      <Link
        href="/explorer/new"
        className="btn-secondary mt-3 inline-flex w-full items-center justify-center"
      >
        Registrar lote
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <SessionMenu />
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted">Tema</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export default function JuLitAppPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // Origins come from the public Supabase `origins` catalogue.
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [catalogueStatus, setCatalogueStatus] =
    useState<CatalogueStatus>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>("sale");
  const [view, setView] = useState<View>("map");
  const [menuOpen, setMenuOpen] = useState(false);
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
    setMenuOpen(false);
  }, []);

  const ready = catalogueStatus === "ready";
  const mapAvailable = mapStatus !== "error";
  const showMap = ready && view === "map" && mapAvailable;

  useLayoutEffect(() => {
    const header = headerRef.current;
    const root = rootRef.current;
    if (!header || !root) return;
    const observer = new ResizeObserver(() => {
      root.style.setProperty("--explorer-chrome", `${header.offsetHeight}px`);
    });
    root.style.setProperty("--explorer-chrome", `${header.offsetHeight}px`);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      if (menuButtonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  return (
    <div
      ref={rootRef}
      className="relative h-dvh w-full overflow-hidden bg-background text-foreground"
    >
      {menuOpen && (
        <div
          aria-hidden
          className="absolute inset-0 z-30 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <header
        ref={headerRef}
        className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:p-4"
      >
        <div className="pointer-events-auto min-w-0 rounded-2xl border border-border bg-card/90 px-3 py-2 shadow-sm backdrop-blur lg:px-4 lg:py-3">
          <Link
            href="/"
            className="text-sm font-bold tracking-tight text-foreground"
          >
            JuLit
          </Link>
          <p className="hidden text-xs text-muted lg:block">
            Demo visual · Puna jujeña
          </p>
        </div>
        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="explorer-menu"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setMenuOpen((open) => !open)}
          className="pointer-events-auto inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-card/90 text-foreground shadow-sm backdrop-blur transition-transform duration-150 ease-out active:scale-[0.97] lg:hidden"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {menuOpen ? (
              <path d="M6 6l12 12M18 6 6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
        <div className="pointer-events-auto hidden items-center gap-2 lg:flex">
          <Link
            href="/explorer/new"
            className="btn-secondary inline-flex shrink-0 items-center whitespace-nowrap"
          >
            Registrar lote
          </Link>
          <CatalogFilterToggle
            filter={catalogFilter}
            onChange={setCatalogFilter}
          />
          <ViewToggle
            view={view}
            onChange={setView}
            mapDisabled={!mapAvailable}
          />
          <SessionMenu />
          <ThemeToggle />
        </div>
        {menuOpen && (
          <ExplorerMenu
            panelRef={menuRef}
            view={view}
            onView={(next) => {
              setView(next);
              setMenuOpen(false);
            }}
            mapDisabled={!mapAvailable}
            filter={catalogFilter}
            onFilter={(next) => {
              setCatalogFilter(next);
              setMenuOpen(false);
            }}
          />
        )}
      </header>

      <div className="absolute inset-0">
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

        {showMap && mapStatus !== "loading" && !titleVisible && (
          <div className="pointer-events-none absolute top-[calc(var(--explorer-chrome,3.5rem)+0.75rem)] left-3 z-20 max-h-[calc(100%-5.5rem)] max-w-[calc(100%-4.75rem)] overflow-y-auto overscroll-contain lg:left-4">
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

        {ready && (
          <div
            role="note"
            className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-10 max-w-[calc(100%-4.75rem)] rounded-lg border border-amber-300 bg-amber-50/95 px-3 py-2 text-[11px] leading-snug text-amber-900 shadow-sm lg:bottom-4 lg:left-4 lg:max-w-xs dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
          >
            <p>
              <strong>Datos de referencia pública.</strong> Ubicaciones,
              capacidades y salares: cada origen cita su fuente.
            </p>
          </div>
        )}
      </div>

      {selectedOrigin && (
        <OriginModal
          key={selectedOrigin.id}
          origin={selectedOrigin}
          filter={catalogFilter}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
