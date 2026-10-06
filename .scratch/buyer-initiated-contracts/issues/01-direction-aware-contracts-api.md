# 01: Direction-aware contracts API

**What to build:** the contracts API understands the two sanctioned flows
(ADR-0008): producer→auditor and buyer→producer. A pure derivation module
maps a contract's company-type pair to its initiator and responder plus a
guard for allowed pairs, covered by vitest. `POST` accepts both flows
(storing the same `producer_id`/`counterparty_id` row shape) and rejects
every other pair; `PATCH` lets only the derived responder accept or
decline a pending contract; `GET` labels each contract from the caller's
posture (initiator vs responder); the company directory gains
`type=producer` so a future buyer-side picker can list producers.
Demoable via fetch calls without any UI: a buyer offers to a producer
and the producer resolves it.

**Blocked by:** None (can start immediately)

**Status:** superseded

- [ ] Pure direction module: pair types → `{ initiator, responder }` (`'producer' | 'counterparty'`) and an allowed-pair guard
- [ ] Vitest covers: producer+auditor pair, producer+buyer pair, every disallowed pair, responder resolution per pair — external behavior only
- [ ] `POST` accepts producer→auditor (unchanged) and buyer→producer; rejects producer→buyer, buyer→auditor, auditor→anything, same-type pairs
- [ ] `POST` still rejects duplicates for the same pair regardless of initiator
- [ ] `PATCH` lets the counterparty respond when it is an auditor, and the producer respond when the counterparty is a buyer; rejects the initiator and non-pending contracts
- [ ] `GET` rows expose the caller's posture as initiator/responder (replacing or augmenting today's producer/counterparty role) so the UI can label sent vs received offers
- [ ] `GET /counterparties` unchanged: accepted buyer contracts qualify for the batch form in either direction
- [ ] `GET /directory` accepts `type=producer`
- [ ] `pnpm test`, `pnpm lint`, `pnpm build` green
