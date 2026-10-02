# Frontend rules — JuLit

3D map dApp: the user picks a point on a 3D map of the region and sees its
on-chain assets for sale. Same pattern as the reference lithium project, but
with JuLit data. Start from mock data with a visible demo notice; replace with
Devnet PDAs (or an index) without touching the components.

## 1. Stack

| Library              | Version | License | Use                                    |
| -------------------- | ------- | ------- | -------------------------------------- |
| `next`               | 16.3.4  | MIT     | App Router                             |
| `react` / `react-dom`| 19.2.3  | MIT     | UI                                     |
| `tailwindcss`        | 4       | MIT     | Styles (tokens in `app/globals.css`)   |
| **`maplibre-gl`**    | **6.11.2** | BSD-3 | Map, globe, 3D terrain, markers, camera |
| **`vgpu`**           | **0.4.1**  | MIT   | WebGPU glow layer for pins (WGSL shader) |
| `qrcode`             | 1.5.4   | MIT     | Public verification QR                 |
| `sonner`             | 2       | MIT     | Toasts                                 |

## 2. Language and formatting

- Code, comments, identifiers: English.
- Everything the end user reads (UI text, toasts, docs for users): Spanish.
- Numbers/dates: `Intl.NumberFormat("es-AR")`.
- On-chain numeric conventions: purity in basis points (99.52 → 9952),
  decimals with fixed multipliers (e.g. ×10), prices in minimal token units.

## 3. Design tokens (`app/globals.css`)

- Use semantic tokens only: `bg-background`, `text-foreground`, `bg-card`,
  `border-border-low`, `text-muted`, `bg-primary` /
  `text-primary-foreground`, `bg-cream`. Never hardcode hex in components.
- Dark mode via `next-themes` (`.dark` class). The map base must follow the
  theme toggle; a light map on dark UI (or vice versa) is a bug.
- Marker/pin styles live in `globals.css` next to the tokens, not in the map
  module.

## 4. Structure

```
app/<feature>/
├── page.tsx              # layout: map (dynamic, ssr:false) + header + notice + panel
├── data/points.ts        # Point/Asset types + data + forSale()
└── components/
    ├── region-map.tsx    # MapLibre: style, terrain, camera, markers
    ├── point-glow-overlay.tsx  # vgpu glow layer
    └── assets-panel.tsx  # side panel / bottom sheet
app/generated/             # Codama TS client — never edit by hand
app/lib/                   # wallet, hooks, solana-client, errors, explorer
```

- "Buy / Settle" stays a toast until the on-chain instruction exists.
- Public detail route (`/<asset>/[id]` with QR) loads without 3D — must open
  in under ~1 s on mobile.
