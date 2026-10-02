# Marketplace con mapa 3D — cómo lo armamos

Guía técnica del frontend de `/marketplace`: un mapa 3D de la Puna jujeña donde el usuario elige una mina y ve sus lotes de carbonato de litio en venta. Está escrita para poder **replicar el mismo patrón en otro proyecto** (otro mineral, otra región, otro tipo de activo geolocalizado).

> Estado: frontend solo, con datos simulados. El botón "Comprar / Liquidar" todavía no firma transacciones: se conecta cuando exista el programa Anchor.

---

## 1. Resultado

1. **Entrada cinematográfica:** el mapa arranca como globo terráqueo y en ~5 s vuela hasta la Puna con la cámara inclinada (pitch 62°).
2. **Relieve 3D real** (elevación ×1,6) sobre una base clara con sombreado, estilo "producto/SaaS".
3. **Un marcador por mina** (tarjeta HTML con nombre, operador y cantidad de lotes en venta).
4. **Brillo WebGPU** (vgpu): anillos que se expanden sobre las minas con lotes `Audited`, dibujados entre el mapa y los marcadores. Sin WebGPU queda un pulso CSS.
5. **Al tocar una mina:** la cámara se acerca y se abre el panel de lotes (lateral en desktop, _bottom sheet_ en mobile).
6. **Aviso permanente** "Datos simulados – demo".

---

## 2. Stack y librerías

| Librería              | Versión    | Licencia | Para qué                                               |
| --------------------- | ---------- | -------- | ------------------------------------------------------ |
| `next`                | 16.3.4     | MIT      | App Router, ruta `/marketplace`                        |
| `react` / `react-dom` | 19.2.3     | MIT      | UI                                                     |
| `tailwindcss`         | 4          | MIT      | Estilos (tokens en `app/globals.css`)                  |
| **`maplibre-gl`**     | **6.11.2** | BSD-3    | Mapa, globo, terreno 3D, hillshade, marcadores, cámara |
| **`vgpu`**            | **0.4.1**  | MIT      | Capa WebGPU con el brillo de las minas (shader WGSL)   |
| `sonner`              | 2          | MIT      | Toasts (ya venía en el template)                       |

Instalación de lo nuevo:

```shell
pnpm add maplibre-gl vgpu
```

**Descartados y por qué:**

- **Leaflet:** no tiene pitch 3D ni terreno.
- **Mapbox GL:** pide token y tiene costo por carga de mapa.
- **deck.gl / Cesium:** potentes pero pesados para un hackathon de 9 h.
- **three.js:** no hizo falta, porque MapLibre ya resuelve el 3D del terreno.

### Fuentes de tiles (gratis, sin token)

| Capa            | URL                                                                                   | Atribución obligatoria                             |
| --------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Base gris claro | `server.arcgisonline.com/.../Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}` | © Esri, HERE, Garmin, © OpenStreetMap contributors |
| Etiquetas       | `.../Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`                    | (misma)                                            |
| Elevación (DEM) | `s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`                     | Terrain Tiles (Mapzen, AWS)                        |

> Para producción comercial revisar los términos de uso de los servicios de Esri. Para demo/hackathon alcanza con mantener la atribución visible (MapLibre la muestra con `attributionControl: { compact: true }`).

---

## 3. Datos

### 3.1 Datos reales (con fuente)

No existe un dataset abierto **lote por lote**: esa información es privada de cada minera. Lo que sí es público y usamos:

| Dato                                   | Valor                                                                                                       | Fuente                                                                                                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Planta Olaroz                          | 23°27'46.54"S 66°42'08.94"O · 3.900 m                                                                       | [Rio Tinto / SEC technical report](https://www.sec.gov/Archives/edgar/data/1977303/000114036123050053/ny20009544x9_ex96-2.htm)                               |
| Planta Cauchari-Olaroz                 | 23°40'26.20"S 66°46'23.84"O                                                                                 | [Cauchari-Olaroz SK 1300 Technical Report 2026](https://www.sec.gov/Archives/edgar/data/1440972/000110465926032465/tm269254d1_ex99-1.htm)                    |
| Capacidad Olaroz                       | ~42.500 t/año                                                                                               | [Rio Tinto 20-F FY2025](https://www.sec.gov/Archives/edgar/data/863064/000162828026009531/rio-20251231.htm)                                                  |
| Capacidad / producción Cauchari-Olaroz | 40.000 t/año · ~34.100 t en 2025                                                                            | Technical report + [Ámbito](https://www.ambito.com/energia/litio-alza-jujuy-cauchari-olaroz-alcanzo-su-maxima-produccion-y-avanza-nuevos-proyectos-n6231512) |
| Huella hídrica Olaroz                  | 51,0 m³/t Li₂CO₃ (46,7 azul + 4,3 gris)                                                                     | [Díaz Paz et al., _Heliyon_ 2025, CC BY 4.0](https://pmc.ncbi.nlm.nih.gov/articles/PMC11869023/)                                                             |
| Pureza grado batería                   | ≥ 99,5 %                                                                                                    | Estándar de mercado                                                                                                                                          |
| Precio spot                            | ~USD 19.750/t (2-sep-2026, CIF Asia)                                                                        | [Benchmark Minerals](https://www.benchmarkminerals.com/lithium/prices)                                                                                       |
| Accionistas                            | Sales de Jujuy: Rio Tinto 66,5 %, Toyota Tsusho 25 %, JEMSE 8,5 % · Exar: Ganfeng, Lithium Argentina, JEMSE | Informes de las empresas                                                                                                                                     |

Datasets abiertos útiles para ampliar (agregados nacionales, sin detalle por proyecto): [datos.gob.ar — Minería / SIACAM](https://datos.gob.ar/dataset?tags=Miner%C3%ADa) (exportaciones de litio, recursos y reservas, empleo en proyectos, CSV).

### 3.2 Datos simulados

`app/marketplace/data/mines.ts` tiene **7 lotes inventados** (4 `Audited` en venta, 2 `Created` en auditoría, 1 `Completed` vendido), con valores verosímiles basados en las cifras reales de arriba:

- Volumen: 240–600 t por lote.
- Pureza: 99,50–99,61 %.
- Huella: 49,6–55,8 m³/t (alrededor de la cifra publicada de Olaroz).
- Precio: 19.500–19.850 USDC/t (alrededor del spot).
- `reportSha256`: hashes de 64 hex inventados (en la app real los calcula el auditor sobre el PDF, RF-2.2).

**Decisión de producto:** se usan los nombres reales de los operadores, pero con el aviso "Datos simulados – demo" siempre visible. El riesgo a evitar: que un QR o una captura parezca un certificado ESG real de esas empresas.

### 3.3 Modelo

```ts
type LotStatus = "Created" | "Audited" | "Completed";

type Lot = {
  batchId: string; // "LIT-2026-EXAR-01"
  status: LotStatus;
  volumeTonnes: number;
  purityPct: number; // on-chain: basis points (99.52 → 9952)
  waterM3PerTonne: number; // on-chain: ×10 (51.0 → 510)
  priceUsdcPerTonne: number; // on-chain: unidades mínimas de USDC (6 dec.)
  reportSha256?: string;
  auditedAt?: string;
};

type Mine = {
  id: string;
  salar: string;
  name: string;
  operator: string;
  shareholders: string;
  coordinates: [number, number]; // [lng, lat] — ¡en ese orden!
  reference: {
    capacityTpa: number;
    altitudeM?: number;
    note: string;
    source: { label: string; url: string };
  };
  lots: Lot[];
};
```

Los campos imitan la cuenta PDA del programa: el día que exista, `lots` se reemplaza por los PDAs leídos de Devnet (o el índice de Supabase, RNF-1) sin tocar los componentes.

---

## 4. Estructura

```
app/marketplace/
├── page.tsx                      # layout: mapa + header + aviso + panel; carga el mapa con next/dynamic (ssr: false)
├── data/mines.ts                 # tipos + datos reales/simulados + lotsForSale()
└── components/
    ├── jujuy-map.tsx             # MapLibre: estilo, terreno, cámara, marcadores
    ├── mine-glow-overlay.tsx     # vgpu: canvas WebGPU con el shader de brillo
    └── lots-panel.tsx            # panel lateral / bottom sheet con los lotes
scripts/copy-maplibre-worker.mjs  # postinstall: copia el worker de MapLibre a public/
app/globals.css                   # .lp-mine-* (marcadores) y .theme-light
```

---

## 5. Cómo funciona cada pieza

### 5.1 Estilo del mapa (`jujuy-map.tsx`)

Un `StyleSpecification` armado a mano, con estas capas, de abajo hacia arriba:

1. `background` (#f4f6f2).
2. Raster base gris claro de Esri.
3. `hillshade` sobre un DEM terrarium: le da el aspecto de mapa topográfico claro.
4. Raster de etiquetas de Esri.

Más dos piezas que no son capas:

- **`terrain`:** `{ source: "dem-terrain", exaggeration: 1.6 }`. Usa **otra fuente DEM**, porque MapLibre recomienda no compartir la misma fuente entre terreno y hillshade.
- **`sky`:** cielo y niebla claros; `atmosphere-blend` se interpola por zoom para que el halo del globo desaparezca al acercarse.

### 5.2 Proyección: globo → mercator

```ts
projection: {
  type: ["interpolate", ["linear"], ["zoom"], 4, "vertical-perspective", 6, "mercator"],
}
```

Globo en la vista mundial y plano a escala regional. **No usar `type: "globe"` solo:** con terreno activo y zoom alto, MapLibre 6.11 descentra la cámara. `map.project()` daba la mina en y=187 en vez de y=450 en un viewport de 900 px; con mercator queda exacta.

### 5.3 Cámara

- **Intro:** el mapa arranca en `zoom 1.8` sobre Sudamérica. En `load` hace `flyTo` a `{ center, zoom: 9.4, pitch: 62, bearing: -24, duration: 5000 }`.
- **Al seleccionar una mina:** `flyTo` a zoom 11.6, con dos detalles:
  - `elevation: map.queryTerrainElevation(coords)` para centrar sobre el terreno real. La mina está a ~3.900 m (×1,6 = 6.240 m).
  - `padding` para dejar lugar al panel: `right: 380` en desktop y `bottom: 55 %` del alto en mobile.
- **Al cerrar el panel:** vuelve a la vista de la intro.

### 5.4 Marcadores

- `new maplibregl.Marker({ element, anchor: "bottom" })` con un `<button>` HTML (accesible por teclado, con `aria-label`).
- Los estilos `.lp-mine-*` están en `globals.css`.
- MapLibre ubica los marcadores sobre la elevación del terreno sin configuración extra.

### 5.5 Brillo WebGPU con vgpu (`mine-glow-overlay.tsx`)

Lo que hace:

- Monta un `<canvas>` **dentro de `map.getCanvasContainer()`** con `createPortal`, con `z-index: 1`. Los marcadores tienen `z-index: 2`, así que el brillo queda entre el mapa y las tarjetas.
- Usa `surface(gpu, canvas, { dpr: [1, 2], clearColor: [0, 0, 0, 0] })`. El `alphaMode` es `premultiplied` por defecto, así que el canvas se compone transparente sobre el mapa.
- Las posiciones de los pines van en un **storage buffer** (`storage(gpu, MAX_PINS * 16, "read")` → `array<vec4f>` en WGSL). En cada frame:
  1. Se proyecta cada mina con `map.project()` (px CSS × `dpr`).
  2. Se escribe el `Float32Array` en el buffer.
  3. Se dibuja el `effect` a pantalla completa.
- El shader suma un halo gaussiano y dos anillos desfasados por pin, y devuelve un color **premultiplicado** (`vec4f(color * a, a)`).
- Fallback: si `"gpu" in navigator` es falso, o si `init()` falla, no se monta nada. Queda el pulso CSS de `.lp-mine-dot::after`, que respeta `prefers-reduced-motion`.

API de vgpu que se usa: `init`, `surface`, `effect`, `storage`, `clock`, `frameLoop`. La documentación viene offline con el paquete:

```shell
npx vgpu docs cat getting-started.md
npx vgpu docs cat /vgpu/surface.docs.md
npx vgpu docs cat /vgpu/effect.docs.md
```

### 5.6 Página y panel

- `page.tsx` es `"use client"` y carga `JujuyMap` con `next/dynamic(..., { ssr: false })`, porque MapLibre y WebGPU solo existen en el navegador.
- `lots-panel.tsx`:
  - Muestra solo los lotes `Audited` y el conteo de los que están en auditoría y vendidos.
  - Formatea los números con `Intl.NumberFormat("es-AR")`.
  - "Comprar / Liquidar" muestra un toast hasta que exista la instrucción on-chain (RF-4.3).

---

## 6. Problemas que encontramos (y la solución)

| Síntoma                                                         | Causa                                                                                                                                                                                           | Solución                                                                                                                                                                                                           |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Error: Worker failed to load` y mapa vacío                     | MapLibre 6 carga su worker como **módulo aparte** (`maplibre-gl-worker.mjs`, que importa `./maplibre-gl-shared.mjs`) con una URL relativa a `import.meta.url`. Turbopack no emite esos archivos | `scripts/copy-maplibre-worker.mjs` (corre en `postinstall`) los copia a `public/maplibre/`, y el mapa llama `maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")`. `public/maplibre/` está en `.gitignore` |
| Mapa en blanco, altura 0                                        | `maplibre-gl.css` fuerza `position: relative` en el contenedor del mapa y pisa `absolute inset-0`                                                                                               | Wrapper `absolute inset-0` y adentro el contenedor con `h-full w-full`                                                                                                                                             |
| `import maplibregl from "maplibre-gl"` no compila               | El paquete no tiene default export                                                                                                                                                              | `import * as maplibregl from "maplibre-gl"`                                                                                                                                                                        |
| Mina descentrada al acercarse                                   | Proyección `globe` + terreno a zoom alto                                                                                                                                                        | Proyección interpolada globo → mercator (§5.2)                                                                                                                                                                     |
| Selector de cluster ilegible                                    | La app arranca en dark (`next-themes`) y el mapa es claro                                                                                                                                       | Clase `.theme-light` en `globals.css`, que redefine los tokens claros solo dentro del marketplace                                                                                                                  |
| Aviso `calculateFogMatrix is not supported on globe projection` | La niebla del `sky` en la vista globo                                                                                                                                                           | Inofensivo, se puede ignorar                                                                                                                                                                                       |
| `next dev` crea `AGENTS.md` y `CLAUDE.md` en la raíz            | Comportamiento de Next 16                                                                                                                                                                       | Commitearlos o desactivar con `agentRules: false` en `next.config.ts`                                                                                                                                              |

---

## 7. Receta para replicarlo en otro proyecto

1. **Dependencias:** `pnpm add maplibre-gl vgpu`.
2. **Worker de MapLibre:** copiar `scripts/copy-maplibre-worker.mjs`, agregar `"postinstall": "node scripts/copy-maplibre-worker.mjs"`, sumar `/public/maplibre/` al `.gitignore` y llamar a `setWorkerUrl` en el módulo del mapa. Con Vite no suele hacer falta, pero si aparece el mismo error la solución es igual.
3. **Datos:** definir `Mine`/`Lot` (o el equivalente: punto + activos). Coordenadas en `[lng, lat]`, sacadas de fuentes verificables (informes técnicos, SEC, registros públicos). Si los datos son inventados, poner un aviso visible.
4. **Estilo:** copiar `LIGHT_TOPO_STYLE`. Si se quiere satelital, cambiar la base por `World_Imagery` de Esri. Ajustar `exaggeration` según el relieve: 1.5–2 para montaña, 1 si es llano.
5. **Cámara:** cambiar `JUJUY_PUNA_CENTER` e `INTRO_VIEW` a la nueva región. Mantener la proyección interpolada y el `elevation` en el `flyTo`.
6. **Brillo:** `MineGlowOverlay` es genérico; recibe `getPins()` con posiciones en px. Cambiar el color en el shader (`teal`) y `MAX_PINS` si hay más de 16 puntos.
7. **Página:** cargar el mapa con `next/dynamic` y `ssr: false`, y probar en desktop y en mobile.
8. **Verificar** con Playwright (`playwright-cli`). Esperar ~8 s a que termine el vuelo, sacar capturas y revisar la consola: no tiene que haber `ERROR`.

### Checklist de verificación

- [ ] `npx tsc --noEmit`, `pnpm lint` y `pnpm format:check` pasan.
- [ ] El mapa carga con relieve (requests a `terrarium` en 200).
- [ ] La consola no tiene `Worker failed to load`.
- [ ] Al tocar un marcador, la mina queda centrada en el espacio libre junto al panel.
- [ ] Con WebGPU se ven los anillos; sin WebGPU se ve el pulso CSS.
- [ ] En mobile, el panel abre como _bottom sheet_ y no tapa la mina.
- [ ] La atribución de los tiles y el aviso de datos simulados son visibles.

---

## 8. Pendientes

- Conectar "Comprar / Liquidar" al programa Anchor (RF-4.3).
- Reemplazar `mines.ts` por PDAs de Devnet o por el índice de Supabase (RNF-1, RNF-3).
- Página pública del pasaporte `/batch/[id]` con QR (RF-3). Sin 3D, para que cargue en menos de 1 s en el celular.
- Pines grises para los otros proyectos de litio de Jujuy (falta verificar sus coordenadas).
- Link a `/marketplace` desde la home.
