"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { batchesForSale, tonnesForSale } from "../data/points";
import type { Origin } from "../data/points";
import { EXPORT_PORTS, EXPORT_ROUTES, OTHER_SALARES } from "../data/points";
import {
  applyBasemap,
  buildStyle,
  bySelection,
  CLUSTER_MAX_ZOOM,
  columnsGeoJson,
  DASH_SEQUENCE,
  INTRO_VIEW,
  ROUTE_COLORS,
  TEAL,
  TEAL_DARK,
  type Basemap,
} from "./map-style";
import { PointGlowOverlay, type GlowFrame } from "./point-glow-overlay";

// Served from public/ by scripts/copy-maplibre-worker.mjs (postinstall).
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export type MapStatus = "loading" | "intro" | "ready" | "error";

/** Below this zoom the context salares stay hidden. */
const CONTEXT_MIN_ZOOM = 6.5;

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

const tonnes = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

function markerMeta(origin: Origin) {
  const forSale = batchesForSale(origin).length;
  return `${origin.producer} · ${plural(forSale, "lote", "lotes")} · ${tonnes.format(tonnesForSale(origin))} t`;
}

function markerHtml(origin: Origin) {
  return `
    <span class="lp-mine-dot" aria-hidden="true"></span>
    <span class="lp-mine-card">
      <span class="lp-mine-name">${origin.name}</span>
      <span class="lp-mine-meta">${markerMeta(origin)}</span>
    </span>
  `;
}

function clusterMetaText(origins: Origin[]) {
  const lots = origins.reduce((n, o) => n + batchesForSale(o).length, 0);
  return `${plural(origins.length, "operación", "operaciones")} · ${plural(lots, "lote", "lotes")} en venta`;
}

function clusterHtml(origins: Origin[]) {
  return `
    <span class="lp-mine-dot" aria-hidden="true"></span>
    <span class="lp-mine-card">
      <span class="lp-mine-name">Puna jujeña</span>
      <span class="lp-mine-meta">${clusterMetaText(origins)}</span>
    </span>
  `;
}

function centroid(points: [number, number][]): [number, number] {
  const n = points.length || 1;
  return [
    points.reduce((s, p) => s + p[0], 0) / n,
    points.reduce((s, p) => s + p[1], 0) / n,
  ];
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Refresh columns and cards when batches change (no restart). */
function syncOriginData(
  map: maplibregl.Map,
  origins: Origin[],
  markers: Map<string, maplibregl.Marker>,
  cluster: maplibregl.Marker | null
) {
  const source = map.getSource("columns") as
    | maplibregl.GeoJSONSource
    | undefined;
  source?.setData(
    columnsGeoJson(origins) as Parameters<
      maplibregl.GeoJSONSource["setData"]
    >[0]
  );
  for (const origin of origins) {
    const card = markers
      .get(origin.id)
      ?.getElement()
      .querySelector(".lp-mine-meta");
    if (card) card.textContent = markerMeta(origin);
  }
  const clusterMeta = cluster?.getElement().querySelector(".lp-mine-meta");
  if (clusterMeta) clusterMeta.textContent = clusterMetaText(origins);
}

function routesBounds() {
  const bounds = new maplibregl.LngLatBounds();
  for (const route of EXPORT_ROUTES) {
    for (const coord of route.coordinates) bounds.extend(coord);
  }
  return bounds;
}

export function RegionMap({
  origins,
  selectedId,
  onSelect,
  onStatusChange,
  skipIntroSignal,
  basemap,
  showRoutes,
}: {
  origins: Origin[];
  selectedId: string | null;
  onSelect: (originId: string | null) => void;
  onStatusChange: (status: MapStatus) => void;
  /** Each increment cuts the intro flight and jumps to the final view. */
  skipIntroSignal: number;
  basemap: Basemap;
  /** Export routes layer (Pacific + Atlantic). */
  showRoutes: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef(new Map<string, maplibregl.Marker>());
  const clusterRef = useRef<maplibregl.Marker | null>(null);
  const contextMarkersRef = useRef<maplibregl.Marker[]>([]);
  const portMarkersRef = useRef<maplibregl.Marker[]>([]);
  const clusteredRef = useRef(true);
  const styleLoadedRef = useRef(false);
  const selectedIdRef = useRef(selectedId);
  const originsRef = useRef(origins);
  const basemapRef = useRef(basemap);
  const onSelectRef = useRef(onSelect);
  const onStatusRef = useRef(onStatusChange);
  const [canvasContainer, setCanvasContainer] = useState<HTMLElement | null>(
    null
  );

  useEffect(() => {
    onSelectRef.current = onSelect;
    onStatusRef.current = onStatusChange;
  }, [onSelect, onStatusChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!skipIntroSignal || !map) return;
    map.stop();
    map.jumpTo(INTRO_VIEW);
    onStatusRef.current("ready");
  }, [skipIntroSignal]);

  useEffect(() => {
    originsRef.current = origins;
    const map = mapRef.current;
    if (map && styleLoadedRef.current) {
      syncOriginData(map, origins, markersRef.current, clusterRef.current);
    }
  }, [origins]);

  useEffect(() => {
    basemapRef.current = basemap;
    const map = mapRef.current;
    if (map && styleLoadedRef.current) applyBasemap(map, basemap);
  }, [basemap]);

  // Init: globe → cinematic flight to the Puna.
  useEffect(() => {
    if (!containerRef.current) return;
    const origins = originsRef.current;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: buildStyle(origins, basemapRef.current),
        center: [-63, -20],
        zoom: 1.8,
        pitch: 0,
        maxPitch: 80,
        attributionControl: { compact: true },
      });
    } catch (err) {
      console.error("Could not start the map", err);
      onStatusRef.current("error");
      return;
    }
    mapRef.current = map;
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "bottom-right"
    );
    const canvas = map.getCanvas();
    const handleContextLost = () => onStatusRef.current("error");
    canvas.addEventListener("webglcontextlost", handleContextLost);

    for (const origin of origins) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "lp-mine-marker";
      el.setAttribute("aria-label", `Ver lotes de ${origin.name}`);
      el.innerHTML = markerHtml(origin);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current(origin.id);
      });
      const marker = new maplibregl.Marker({
        element: el,
        anchor: "left",
        offset: [-6, 0],
      })
        .setLngLat(origin.coordinates)
        .addTo(map);
      markersRef.current.set(origin.id, marker);
    }

    const clusterEl = document.createElement("button");
    clusterEl.type = "button";
    clusterEl.className = "lp-mine-marker lp-mine-marker--cluster";
    clusterEl.setAttribute("aria-label", "Acercar a los orígenes de la Puna");
    clusterEl.innerHTML = clusterHtml(origins);
    clusterEl.addEventListener("click", (e) => {
      e.stopPropagation();
      map.flyTo({ ...INTRO_VIEW, duration: 2500, essential: true });
    });
    clusterRef.current = new maplibregl.Marker({
      element: clusterEl,
      anchor: "left",
      offset: [-6, 0],
    })
      .setLngLat(centroid(origins.map((o) => o.coordinates)))
      .addTo(map);

    contextMarkersRef.current = OTHER_SALARES.map((salar) => {
      const el = document.createElement("div");
      el.className = "lp-salar-marker";
      el.innerHTML = `
        <span class="lp-salar-dot" aria-hidden="true"></span>
        <span class="lp-salar-card">
          <span class="lp-salar-name">${salar.name}</span>
          <span class="lp-salar-meta">Proyectos en exploración · sin lotes</span>
        </span>
      `;
      return new maplibregl.Marker({
        element: el,
        anchor: "left",
        offset: [-4, 0],
      })
        .setLngLat(salar.center)
        .addTo(map);
    });

    portMarkersRef.current = EXPORT_PORTS.map((port) => {
      const corridor = port.id === "antofagasta" ? "pacific" : "atlantic";
      const el = document.createElement("div");
      el.className = "lp-port-marker lp-hidden";
      el.innerHTML = `
        <span class="lp-port-icon" style="background:${ROUTE_COLORS[corridor]}" aria-hidden="true">⚓</span>
        <span class="lp-port-card">
          <span class="lp-port-name">${port.name}</span>
          <span class="lp-port-meta">${port.country} · ${corridor === "pacific" ? "Pacífico" : "Atlántico"}</span>
        </span>
      `;
      const west = corridor === "pacific";
      if (west) el.classList.add("lp-port-marker--west");
      return new maplibregl.Marker({
        element: el,
        anchor: west ? "right" : "left",
        offset: [west ? 11 : -11, 0],
      })
        .setLngLat(port.coordinates)
        .addTo(map);
    });

    const syncZoomDependent = () => {
      const zoom = map.getZoom();
      const clustered = zoom < CLUSTER_MAX_ZOOM;
      clusteredRef.current = clustered;
      clusterEl.classList.toggle("lp-hidden", !clustered);
      markersRef.current.forEach((m) =>
        m.getElement().classList.toggle("lp-hidden", clustered)
      );
      contextMarkersRef.current.forEach((m) =>
        m.getElement().classList.toggle("lp-hidden", zoom < CONTEXT_MIN_ZOOM)
      );
    };
    syncZoomDependent();
    map.on("zoom", syncZoomDependent);

    map.once("load", () => {
      styleLoadedRef.current = true;
      syncOriginData(
        map,
        originsRef.current,
        markersRef.current,
        clusterRef.current
      );
      applyBasemap(map, basemapRef.current);
      setCanvasContainer(map.getCanvasContainer());
      if (prefersReducedMotion()) {
        map.jumpTo(INTRO_VIEW);
        onStatusRef.current("ready");
        return;
      }
      onStatusRef.current("intro");
      map.flyTo({ ...INTRO_VIEW, duration: 5000, essential: true });
      map.once("moveend", () => onStatusRef.current("ready"));
    });

    const markers = markersRef.current;
    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      markers.forEach((m) => m.remove());
      markers.clear();
      clusterRef.current?.remove();
      contextMarkersRef.current.forEach((m) => m.remove());
      portMarkersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
      styleLoadedRef.current = false;
    };
  }, []);

  // Selection: move the camera, highlight the origin, dim the rest.
  useEffect(() => {
    selectedIdRef.current = selectedId;
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      el.classList.toggle("lp-mine-marker--selected", id === selectedId);
      el.classList.toggle(
        "lp-mine-marker--dimmed",
        selectedId !== null && id !== selectedId
      );
    });

    if (map.getLayer("columns")) {
      map.setPaintProperty(
        "columns",
        "fill-extrusion-color",
        bySelection(selectedId, TEAL_DARK, "#a8b5b0", TEAL)
      );
      map.setPaintProperty(
        "salares-line",
        "line-opacity",
        bySelection(selectedId, 1, 0.35, 0.7)
      );
    }

    const origin = originsRef.current.find((o) => o.id === selectedId);
    if (origin) {
      const isDesktop = window.innerWidth >= 768;
      map.flyTo({
        center: origin.coordinates,
        elevation: map.queryTerrainElevation(origin.coordinates) ?? undefined,
        zoom: 11.6,
        pitch: 62,
        bearing: -18,
        duration: 2200,
        essential: true,
        padding: {
          right: isDesktop ? 400 : 0,
          top: 0,
          bottom: isDesktop ? 0 : Math.round(window.innerHeight * 0.55),
          left: 0,
        },
      });
    } else if (styleLoadedRef.current) {
      map.flyTo({ ...INTRO_VIEW, duration: 1800, padding: 0, essential: true });
    }
  }, [selectedId]);

  // Export routes: layers, ports, animated flow and framing.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;
    const visibility = showRoutes ? "visible" : "none";
    map.setLayoutProperty("routes-casing", "visibility", visibility);
    map.setLayoutProperty("routes-line", "visibility", visibility);
    portMarkersRef.current.forEach((m) =>
      m.getElement().classList.toggle("lp-hidden", !showRoutes)
    );

    if (showRoutes) {
      map.fitBounds(routesBounds(), {
        padding: { top: 120, bottom: 90, left: 80, right: 80 },
        pitch: 30,
        bearing: 0,
        duration: 2600,
        essential: true,
      });
    } else if (!selectedIdRef.current) {
      map.flyTo({ ...INTRO_VIEW, duration: 2000, padding: 0, essential: true });
    }

    if (!showRoutes || prefersReducedMotion()) return;
    let step = 0;
    let last = 0;
    let frame = requestAnimationFrame(function animate(now) {
      if (now - last > 60) {
        last = now;
        step = (step + 1) % DASH_SEQUENCE.length;
        map.setPaintProperty(
          "routes-line",
          "line-dasharray",
          DASH_SEQUENCE[step]
        );
      }
      frame = requestAnimationFrame(animate);
    });
    return () => cancelAnimationFrame(frame);
  }, [showRoutes]);

  const getFrame = useCallback((): GlowFrame => {
    const map = mapRef.current;
    if (!map) return { pins: [] };
    const origins = originsRef.current;
    const selected = selectedIdRef.current;

    const pins = clusteredRef.current
      ? [
          {
            ...map.project(centroid(origins.map((o) => o.coordinates))),
            selected: false,
            dimmed: false,
          },
        ]
      : origins
          .filter((origin) => batchesForSale(origin).length > 0)
          .map((origin) => {
            const point = map.project(origin.coordinates);
            return {
              x: point.x,
              y: point.y,
              selected: origin.id === selected,
              dimmed: selected !== null && origin.id !== selected,
            };
          });

    return { pins };
  }, []);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full">
        {canvasContainer && (
          <PointGlowOverlay container={canvasContainer} getFrame={getFrame} />
        )}
      </div>
    </div>
  );
}
