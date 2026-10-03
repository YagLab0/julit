# 03: `/audit/[pda]` certification page — single-step certify form

**What to build:** the per-batch certification page, linked from each pending
batch card. Full batch summary plus a single-step form: PDF input validated
client-side for `application/pdf` and the 50 MiB bucket limit, SHA-256 computed
locally via `crypto.subtle` and shown lowercase-hex, required ESG approval
(yes/no) and EU assessment (conformant / non_conformant) declarations. Submit
mutates the demo batch to `audited` with the declared findings and digest,
toasts at the API/program boundary (like the register form before
`create_batch`), and returns to `/audit`. Certify rules live in a pure
validation module with vitest coverage — the spec's single test seam.

**Blocked by:** 01 (needs the demo store and the list that links here)

**Status:** ready-for-agent

- [ ] Server page awaits `params`, replicates the auditor gate chain; deep links can't bypass identity checks
- [ ] Unknown or already-certified batch renders a clear state, not the form
- [ ] Non-PDF files and files over 50 MiB rejected client-side with field errors
- [ ] PDF SHA-256 computed in-browser and displayed as lowercase hex
- [ ] Submit disabled until digest + ESG choice + EU choice are all present
- [ ] Submit mutates the demo batch to `audited` with findings + digest, toasts, returns to `/audit`; the batch then appears in the certified section
- [ ] Pure validation module (input → errors/payload `{ digest, esgApproved, euAssessment }`) with vitest tests: missing file, wrong MIME, oversize, missing ESG, missing EU, happy path
- [ ] `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm format:check` green
