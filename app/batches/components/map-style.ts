// Map style: sources, layers and the three basemap modes (light, dark and
// satellite). A single style with every base: switching modes only toggles
// layers on and off, no setStyle (which would reset terrain, sources and
// markers). Ported from lithium-passport, Mine -> Origin.

import type {
  ExpressionSpecification,
  GeoJSONSourceSpecification,
  Map as MapLibreMap,
  SkySpecification,
  StyleSpecification,
} from "maplibre-gl";
import { JUJUY_PUNA_CENTER } from "../data/points";
import { EXPORT_ROUTES } from "../data/points";
import { OTHER_SALARES_GEOJSON } from "../data/points";
import { SALARES } from "../data/points";
import { BRAND } from "./brand";

export type Basemap = "light" | "dark" | "satellite";

export const TEAL = BRAND;
export const ROUTE_COLORS = {
  pacific: "#0284c7",
  atlantic: "#d97706",
} as const;

/** Below this zoom the origins collapse into a single marker. */
export const CLUSTER_MAX_ZOOM = 7.5;

export const INTRO_VIEW = {
  center: JUJUY_PUNA_CENTER,
  zoom: 9.4,
  pitch: 62,
  bearing: -24,
};

// Elevation: AWS Terrain Tiles (Mapzen / Terrarium). Free, no token.
const DEM_TILES = [
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
];
const DEM_ATTRIBUTION =
  '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener noreferrer">Terrain Tiles (Mapzen, AWS)</a>';
const OSM_ATTRIBUTION =
  'Salares y rutas: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors (ODbL)</a>';

const esri = (service: string) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`;

function routesGeoJson(): GeoJSONSourceSpecification["data"] {
  return {
    type: "FeatureCollection",
    features: EXPORT_ROUTES.map((route) => ({
      type: "Feature",
      properties: { id: route.id, corridor: route.corridor },
      geometry: { type: "LineString", coordinates: route.coordinates },
    })),
  };
}

/** Color per origin: the selected one pops, the rest dim. */
export function bySelection<T extends string | number>(
  selectedId: string | null,
  selected: T,
  others: T,
  none: T
): ExpressionSpecification | T {
  if (!selectedId) return none;
  return ["case", ["==", ["get", "originId"], selectedId], selected, others];
}

const ATMOSPHERE_BLEND: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  0,
  0.8,
  6,
  0.3,
  9,
  0,
];

/** Everything that changes between basemap modes. */
type BasemapLook = {
  rasterLayers: string[];
  background: string;
  sky: SkySpecification;
  hillshade: {
    shadow: string;
    highlight: string;
    accent: string;
    exaggeration: number;
  };
  salarFill: { color: string; opacity: number };
  otherSalar: { fill: string; fillOpacity: number; line: string };
  routeCasing: string;
};

const LOOKS: Record<Basemap, BasemapLook> = {
  light: {
    rasterLayers: ["base-light", "labels-light"],
    background: "#f4f6f2",
    sky: {
      "sky-color": "#fafaf6",
      "horizon-color": "#eef2ee",
      "fog-color": "#f4f6f2",
      "sky-horizon-blend": 0.5,
      "horizon-fog-blend": 0.4,
      "fog-ground-blend": 0.6,
      "atmosphere-blend": ATMOSPHERE_BLEND,
    },
    hillshade: {
      shadow: "#5b6b63",
      highlight: "#ffffff",
      accent: "#3d4a44",
      exaggeration: 0.55,
    },
    salarFill: { color: "#ffffff", opacity: 0.82 },
    otherSalar: { fill: "#d6d3d1", fillOpacity: 0.45, line: "#a8a29e" },
    routeCasing: "#ffffff",
  },
  dark: {
    rasterLayers: ["base-dark", "labels-dark"],
    background: "#0a0a0a",
    sky: {
      "sky-color": "#0a0a0a",
      "horizon-color": "#1c1917",
      "fog-color": "#111111",
      "sky-horizon-blend": 0.5,
      "horizon-fog-blend": 0.4,
      "fog-ground-blend": 0.6,
      "atmosphere-blend": ATMOSPHERE_BLEND,
    },
    hillshade: {
      shadow: "#000000",
      highlight: "#5c5c5c",
      accent: "#1f1f1f",
      exaggeration: 0.6,
    },
    salarFill: { color: "#e7e5e4", opacity: 0.7 },
    otherSalar: { fill: "#57534e", fillOpacity: 0.5, line: "#78716c" },
    routeCasing: "#0a0a0a",
  },
  satellite: {
    rasterLayers: ["base-satellite", "labels-satellite"],
    background: "#1c1917",
    sky: {
      "sky-color": "#bcd4e6",
      "horizon-color": "#e8eef2",
      "fog-color": "#d7dde0",
      "sky-horizon-blend": 0.5,
      "horizon-fog-blend": 0.4,
      "fog-ground-blend": 0.5,
      "atmosphere-blend": ATMOSPHERE_BLEND,
    },
    hillshade: {
      shadow: "#000000",
      highlight: "#ffffff",
      accent: "#000000",
      exaggeration: 0.15,
    },
    salarFill: { color: "#ffffff", opacity: 0.12 },
    otherSalar: { fill: "#ffffff", fillOpacity: 0.08, line: "#e7e5e4" },
    routeCasing: "#0a0a0a",
  },
};

const ALL_RASTER_LAYERS = Object.values(LOOKS).flatMap((l) => l.rasterLayers);

export function buildStyle(basemap: Basemap): StyleSpecification {
  const look = LOOKS[basemap];
  const raster = (id: string, source: string) => ({
    id,
    type: "raster" as const,
    source,
    layout: {
      visibility: (look.rasterLayers.includes(id) ? "visible" : "none") as
        "visible" | "none",
    },
  });

  return {
    version: 8,
    projection: {
      type: [
        "interpolate",
        ["linear"],
        ["zoom"],
        4,
        "vertical-perspective",
        6,
        "mercator",
      ],
    },
    sky: look.sky,
    sources: {
      "esri-light": {
        type: "raster",
        tiles: [esri("Canvas/World_Light_Gray_Base")],
        tileSize: 256,
        maxzoom: 16,
        attribution: "© Esri, HERE, Garmin, © OpenStreetMap contributors",
      },
      "esri-light-ref": {
        type: "raster",
        tiles: [esri("Canvas/World_Light_Gray_Reference")],
        tileSize: 256,
        maxzoom: 16,
      },
      "esri-dark": {
        type: "raster",
        tiles: [esri("Canvas/World_Dark_Gray_Base")],
        tileSize: 256,
        maxzoom: 16,
        attribution: "© Esri, HERE, Garmin, © OpenStreetMap contributors",
      },
      "esri-dark-ref": {
        type: "raster",
        tiles: [esri("Canvas/World_Dark_Gray_Reference")],
        tileSize: 256,
        maxzoom: 16,
      },
      "esri-imagery": {
        type: "raster",
        tiles: [esri("World_Imagery")],
        tileSize: 256,
        maxzoom: 19,
        attribution: "© Esri, Maxar, Earthstar Geographics",
      },
      "esri-imagery-ref": {
        type: "raster",
        tiles: [esri("Reference/World_Boundaries_and_Places")],
        tileSize: 256,
        maxzoom: 19,
      },
      "dem-terrain": {
        type: "raster-dem",
        tiles: DEM_TILES,
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: 14,
        attribution: DEM_ATTRIBUTION,
      },
      "dem-hillshade": {
        type: "raster-dem",
        tiles: DEM_TILES,
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: 14,
      },
      salares: {
        type: "geojson",
        data: SALARES as GeoJSONSourceSpecification["data"],
        attribution: OSM_ATTRIBUTION,
      },
      "other-salares": {
        type: "geojson",
        data: OTHER_SALARES_GEOJSON as GeoJSONSourceSpecification["data"],
      },
      routes: { type: "geojson", data: routesGeoJson() },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": look.background },
      },
      raster("base-light", "esri-light"),
      raster("base-dark", "esri-dark"),
      raster("base-satellite", "esri-imagery"),
      {
        id: "hillshade",
        type: "hillshade",
        source: "dem-hillshade",
        paint: {
          "hillshade-shadow-color": look.hillshade.shadow,
          "hillshade-highlight-color": look.hillshade.highlight,
          "hillshade-accent-color": look.hillshade.accent,
          "hillshade-exaggeration": look.hillshade.exaggeration,
        },
      },
      {
        id: "other-salares-fill",
        type: "fill",
        source: "other-salares",
        paint: {
          "fill-color": look.otherSalar.fill,
          "fill-opacity": look.otherSalar.fillOpacity,
        },
      },
      {
        id: "other-salares-line",
        type: "line",
        source: "other-salares",
        paint: {
          "line-color": look.otherSalar.line,
          "line-width": 1.2,
          "line-dasharray": [2, 2],
        },
      },
      {
        id: "salares-fill",
        type: "fill",
        source: "salares",
        paint: {
          "fill-color": look.salarFill.color,
          "fill-opacity": look.salarFill.opacity,
        },
      },
      {
        id: "salares-line",
        type: "line",
        source: "salares",
        paint: {
          "line-color": TEAL,
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.8, 11, 2],
          "line-opacity": 0.7,
        },
      },
      raster("labels-light", "esri-light-ref"),
      raster("labels-dark", "esri-dark-ref"),
      raster("labels-satellite", "esri-imagery-ref"),
      {
        id: "routes-casing",
        type: "line",
        source: "routes",
        layout: {
          visibility: "none",
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": look.routeCasing,
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 4, 10, 8],
          "line-opacity": 0.8,
        },
      },
      {
        id: "routes-line",
        type: "line",
        source: "routes",
        layout: { visibility: "none", "line-join": "round" },
        paint: {
          "line-color": [
            "match",
            ["get", "corridor"],
            "pacific",
            ROUTE_COLORS.pacific,
            ROUTE_COLORS.atlantic,
          ],
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 2, 10, 4],
          "line-dasharray": [0, 4, 3],
        },
      },
    ],
    terrain: { source: "dem-terrain", exaggeration: 1.6 },
  };
}

/** Switch the basemap without reloading the style. */
export function applyBasemap(map: MapLibreMap, basemap: Basemap) {
  const look = LOOKS[basemap];
  for (const id of ALL_RASTER_LAYERS) {
    map.setLayoutProperty(
      id,
      "visibility",
      look.rasterLayers.includes(id) ? "visible" : "none"
    );
  }
  map.setPaintProperty("background", "background-color", look.background);
  map.setPaintProperty(
    "hillshade",
    "hillshade-shadow-color",
    look.hillshade.shadow
  );
  map.setPaintProperty(
    "hillshade",
    "hillshade-highlight-color",
    look.hillshade.highlight
  );
  map.setPaintProperty(
    "hillshade",
    "hillshade-accent-color",
    look.hillshade.accent
  );
  map.setPaintProperty(
    "hillshade",
    "hillshade-exaggeration",
    look.hillshade.exaggeration
  );
  map.setPaintProperty("salares-fill", "fill-color", look.salarFill.color);
  map.setPaintProperty("salares-fill", "fill-opacity", look.salarFill.opacity);
  map.setPaintProperty(
    "other-salares-fill",
    "fill-color",
    look.otherSalar.fill
  );
  map.setPaintProperty(
    "other-salares-fill",
    "fill-opacity",
    look.otherSalar.fillOpacity
  );
  map.setPaintProperty(
    "other-salares-line",
    "line-color",
    look.otherSalar.line
  );
  map.setPaintProperty("routes-casing", "line-color", look.routeCasing);
  map.setSky(look.sky);
}

/**
 * "line-dasharray" sequence that reads as flow along the route
 * (from the Mapbox/MapLibre "animate a line" example).
 */
export const DASH_SEQUENCE: number[][] = [
  [0, 4, 3],
  [0.5, 4, 2.5],
  [1, 4, 2],
  [1.5, 4, 1.5],
  [2, 4, 1],
  [2.5, 4, 0.5],
  [3, 4, 0],
  [0, 0.5, 3, 3.5],
  [0, 1, 3, 3],
  [0, 1.5, 3, 2.5],
  [0, 2, 3, 2],
  [0, 2.5, 3, 1.5],
  [0, 3, 3, 1],
  [0, 3.5, 3, 0.5],
];
