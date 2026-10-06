# 03: Producer buyer-offer inbox card

**What to build:** a dedicated card on the producer's account page that
lists pending contract offers from buyer companies — the offers a
buyer-side UI (teammate's future commit) or direct API calls create —
with the buyer's company name and Aceptar/Rechazar actions wired to the
contracts response endpoint. Only producers see it. The generic
"ofertas pendientes" section in the existing contracts card is scoped so
producer-responder offers render in the inbox card only, never twice.
Copy reads responder-direction ("quiere comprar tu producción" or
equivalent), not the auditor phrasing. End-to-end: a buyer offer lands
pending, the producer accepts it, and the buyer becomes selectable in
the batch form's "Mis clientes" dropdown.

**Blocked by:** 01 (direction-aware GET/PATCH + responder posture),
02 (same file: account client)

**Status:** superseded

- [ ] New card renders for producers only, listing pending contracts where the caller is the responder and the counterparty is a buyer
- [ ] Each offer shows the buyer's company name with Aceptar/Rechazar buttons calling the respond endpoint; list refreshes after responding
- [ ] Empty state when no pending buyer offers
- [ ] The contracts card's generic pending-incoming section never double-renders producer-responder offers
- [ ] Buyer and auditor accounts do not see the inbox card; their own pending-incoming section still works
- [ ] Accepting a buyer offer makes that buyer appear in the batch form's reserved-buyer dropdown (verified manually)
- [ ] `pnpm lint`, `pnpm build` green
