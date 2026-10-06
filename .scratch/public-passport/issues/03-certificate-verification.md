# 03: Certificate section and staged verification

**What to build:** for certified Batches, the passport's certificate section —
the public certificate PDF link from its content-addressed location and the
recorded digest truncated — and the on-demand Certificate Verification: the
visitor downloads the PDF, the bytes are hashed in the browser and compared
against the digest recorded for the batch through the module's verdict
function (normalised hex). The match verdict names its source: the PDF matches
the digest indexed for the batch, and Solana verification arrives with on-chain
certification (ADR-0010) — never "verificado en Solana". Mismatch and
download failure are distinct states and a failure yields no verdict. The
section renders only when the indexed row carries a digest and certificate
path. Exercised with a disposable local fixture — an audited row plus a
fixture PDF whose SHA-256 matches, and a tampered copy for the mismatch — in
the local stack only; production is never seeded (ADR-0009).

**Blocked by:** 01 (the page the section renders on)

**Status:** superseded

- [ ] A certified Batch shows the certificate PDF link and the recorded digest (truncated)
- [ ] Verdict unit tests: equal hex in either case → match; any difference, including malformed computed hex → mismatch
- [ ] "Verificar certificado" hashes the downloaded bytes in the browser and renders the staged, source-naming verdict
- [ ] Mismatch (tampered PDF) and download failure render distinct states; a failure shows no verdict
- [ ] `created` Batches show no certificate section
- [ ] Exercised end-to-end with a disposable local fixture in the local stack only; production is never seeded
- [ ] `pnpm test`, `pnpm build`, `pnpm lint`, `pnpm format:check` pass
