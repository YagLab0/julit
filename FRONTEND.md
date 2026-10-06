# Frontend rules — JuLit

3D map dApp: the user picks a point on a 3D map of the region and sees its
on-chain assets for sale. Same pattern as the reference lithium project, but
with JuLit data. Origins and the indexed batches come from the public Supabase
catalogue through anonymous reads; no simulated batch data ships (ADR-0007).

## 1. Stack

| Library               | Version     | License | Use                                                     |
| --------------------- | ----------- | ------- | ------------------------------------------------------- |
| `next`                | 16.3.4      | MIT     | App Router                                              |
| `react` / `react-dom` | 19.2.3      | MIT     | UI                                                      |
| `tailwindcss`         | 4           | MIT     | Styles (tokens in `app/globals.css`)                    |
| **`maplibre-gl`**     | **6.11.2**  | BSD-3   | Map, globe, 3D terrain, markers, camera                 |
| **`vgpu`**            | **0.4.1**   | MIT     | WebGPU glow layer for pins (WGSL shader)                |
| **`three`**           | **0.186.1** | MIT     | Stylized mine models in MapLibre's shared WebGL context |
| `qrcode`              | 1.5.4       | MIT     | Public verification QR                                  |
| `sonner`              | 2           | MIT     | Toasts                                                  |

## 2. Language and formatting

- Code, comments, identifiers: English.
- Everything the end user reads (UI text, toasts, docs for users): Spanish.
- Numbers/dates: `Intl.NumberFormat("es-AR")`.
- On-chain numeric conventions: purity in basis points (99.52 → 9952),
  decimals with fixed multipliers (e.g. ×10), prices in minimal token units.

## 3. Design tokens (`app/globals.css`)

- Surfaces/text/borders: semantic tokens only (`bg-background`,
  `text-foreground`, `bg-card`, `border-border-low`, `text-muted`,
  `bg-secondary`, `hover:bg-accent`). Never hardcode hex in components.
- Brand: `--color-brand-*` scale (plain `@theme`, teal by default) with
  utilities (`bg-brand-600`, `text-brand-700`, `ring-brand-200`…).
  `--color-primary` points at the brand (`brand-600` light /
  `brand-500` dark), so `bg-primary` buttons follow the retheme.
- Roles: `.btn-primary` = main actions (solid brand),
  `.btn-secondary` = secondary actions (neutral outline, theme-aware),
  `.eyebrow` = section labels. Never rebuild these styles inline.
- Retheme: change the brand scale in `globals.css` + the matching values
  in `app/explorer/components/brand.ts` (JS realm: MapLibre paint +
  WebGPU shader can't read CSS vars). Map markers reference the same
  vars (`var(--color-brand-600)`); route colors stay in `map-style.ts`
  (map-semantic, not brand). Status colors (amber/emerald) stay fixed.
- Radius: `--radius` drives `rounded-md/lg/xl`. For a square UI also set
  `--radius-2xl: 0` (`rounded-2xl` follows the Tailwind default, and
  `rounded-full` pills/dots stay round on purpose).
- Dark mode via `next-themes` (`.dark` class). The map base must follow the
  theme toggle; a light map on dark UI (or vice versa) is a bug.
- Marker/pin styles live in `globals.css` next to the tokens, not in the map
  module.

## 4. Structure

```
app/<feature>/
├── page.tsx              # layout: map (dynamic, ssr:false) + header + notice + panel
├── data/origins.ts       # Supabase origins row type + ORIGIN_COLUMNS + helpers
├── data/batches.ts       # Supabase batch index row type + BATCH_COLUMNS
├── data/use-origin-batches.ts  # anonymous per-origin batch read hook
├── data/points.ts        # geographic reference only (salar polygons, routes, ports)
└── components/
    ├── region-map.tsx    # MapLibre: style, terrain, camera, markers
    ├── point-glow-overlay.tsx  # vgpu glow layer
    ├── assets-panel.tsx  # side panel / bottom sheet
    ├── origin-batches.tsx  # per-origin batch section (loading, retry, empty, cards)
    ├── batch-card.tsx    # compact public batch fiche (list view)
    ├── batch-display.tsx # batch formatters, status badge, metric chips, rows
    ├── batch-model.tsx   # r3f big-bag 3D stack (visual scale, 1 bag ≈ 40 t)
    ├── mine-geometry.ts  # procedural lithium-brine diorama (ponds, plant, tanks)
    └── mine-layer.ts     # Three.js custom MapLibre layer, rigid terrain anchors
app/generated/             # Codama TS client — never edit by hand
app/lib/                   # wallet, hooks, solana-client, errors, explorer
```

- "Buy / Settle" stays a toast until the on-chain instruction exists.
- Public detail route (`/<asset>/[id]` with QR) loads without 3D — must open
  in under ~1 s on mobile.

- Mine models are symbolic lithium-brine operations, not surveyed footprints.
  Their exaggerated dimensions are fixed: batch availability and tonnes do not
  resize or hide the site. Each model shares one terrain elevation at the plant
  coordinate, so ponds and buildings cannot drift apart on uneven ground.
- The origin fiche renders the selected batch as a 3D big-bag stack in the
  modal (single canvas, r3f, client-only). Visual scale only: 1 bag ≈ 40 t,
  rendered bags capped at 60 so a probe row cannot stall the scene. It lists
  every indexed batch (Creado/Auditado/Completado) and shows audit findings
  explicitly; the 3D stack never replaces the numeric metrics.
- Mine cards sit above their ground-level pins to leave the dioramas visible.
  The custom layer follows map rendering rather than running an animation loop;
  it disposes its geometries, materials, and renderer when the map is removed.
