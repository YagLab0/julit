# 03: Origin fiche becomes a centred single-lot view

**What to build:** the explorer origin modal shows the mine's production
profile — 3D lot stage, declared metrics, plant certificate, public
passport and source references — in one centred column. The lot browser
(lot lists, sorting, selection), the commercial-contract banner and the
lifecycle action footer are gone; a single centred "Conectar con
productor" button replaces the footer.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The modal renders a single centred column: lot stage, metrics,
      certificate/provenance block, passport block, and `OriginReference`
      at the bottom.
- [ ] The displayed lot is the first `listed` one (else the first
      non-listed); there is no lot switcher.
- [ ] Header stats show only "Disponible" and "Capacidad"; the
      "Lotes publicados" counter is gone.
- [ ] The footer is a single centred "Conectar con productor" button
      rendered as a `mailto:` anchor with a placeholder target constant.
- [ ] Removed: right column (contract banner, published/settled lists),
      `handleRequestContract` and its producer/contract fetches, all five
      lifecycle handlers and their instruction/ATA/memo imports,
      `useQuantizedNow`, sort state, `selectedPda`, and the unused
      `filter` prop including its call site.
- [ ] `lot-display.tsx` exports that become dead (`SortSelect`,
      `sortLots`, `SortKey`, `LotRow`) are deleted.
- [ ] `FicheSkeleton` renders a single-column placeholder.
- [ ] Empty (no lots) and error states still render correctly.
