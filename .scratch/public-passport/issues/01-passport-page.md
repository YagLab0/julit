# 01: Public passport page renders the indexed record

**What to build:** the public `/batch/<PDA_ADDRESS>` route: an anonymous,
server-rendered passport showing the Batch's product record from the public
index — identifier, status badge, Origin (salar and producer display name),
production metrics (volume; purity with the battery-grade chip) and
sustainability metrics (water against the Origin's public reference; carbon) —
plus findings for audited Batches, displayed explicitly including negative
ones (ADR-0004), and an explicit certification-pending state for `created`
Batches. A provenance block shows the PDA with its Devnet Explorer address
link, the creation transaction link and the labelled index snapshot date. The
page carries a per-batch title, uses the catalogue's existing display module
and formatters, renders no 3D or map code, and pins Devnet. An unknown or
malformed PDA renders "Pasaporte no encontrado" with a link to the catalogue.
The passport's index read additionally selects the producer wallet and the
creation transaction signature; catalogue queries stay unchanged. No price,
reservation or buyer data appears anywhere (ADR-0013).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `/batch/<PDA_ADDRESS>` of the two production `created` batches renders the complete record anonymously — no session, no wallet
- [ ] `created` shows the explicit certification-pending state with no findings and no certificate
- [ ] An audited row shows ESG and EU findings explicitly, including negative ones (exercised with a disposable local fixture; production is never seeded)
- [ ] Provenance: PDA, Explorer address link and creation transaction link Devnet-pinned, plus the index snapshot date labelled as the index's
- [ ] Unknown or malformed PDA renders "Pasaporte no encontrado" with a catalogue link and a proper not-found response
- [ ] Page title names the batch; no 3D/map code on the route; semantic tokens; `es-AR` formatting; light and dark
- [ ] No price, reservation or buyer data anywhere (ADR-0013)
- [ ] `pnpm build`, `pnpm lint`, `pnpm format:check` pass
