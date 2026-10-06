# 04: Passport QR and sharing

**What to build:** the shared QR block and its two surfaces. One client
component renders the derived passport URL onto a canvas with the installed
`qrcode` package, built from the request origin after mount, labelled for
screen readers. The catalogue's batch fiche shows it in a compact variant with
a "Ver pasaporte" link; the passport page shows its own. Both offer "Copiar
enlace" (clipboard plus a confirmation toast, with an explicit failure report
when the clipboard is unavailable) and "Descargar PNG", producing a
print-quality file named `julit-pasaporte-<batch_id>.png`. The QR encodes only
the derived URL — never stored server-side, and list-view cards do not change.

**Blocked by:** 01 (the passport URL the QR points at)

**Status:** superseded

- [ ] One shared QR component renders the derived passport URL, labelled for screen readers, in light and dark
- [ ] The catalogue batch fiche shows the compact block: "Ver pasaporte" link + QR + both actions
- [ ] The passport page shows its own QR with both actions; scanning either opens the same URL
- [ ] Copy places the absolute URL on the clipboard and confirms with a toast; a clipboard failure reports explicitly
- [ ] Download produces a print-quality PNG named `julit-pasaporte-<batch_id>.png`
- [ ] No server-side storage or API for QR images; the URL is derived per view
- [ ] `pnpm build`, `pnpm lint`, `pnpm format:check` pass
