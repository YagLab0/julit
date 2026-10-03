# 02: `certify_batch` Anchor instruction + regenerated Codama client

**What to build:** the on-chain certification. `certify_batch` takes the
32-byte certificate digest, the ESG approval boolean, and the EU assessment
enum (`Conformant | NonConformant`); it requires `status == Created`, the
signer to equal `batch.auditor`, and inits an `audit` PDA (`["audit",
batch]` — one-shot, so certification happens exactly once) storing hash +
findings + slot. `Batch` stays untouched so existing accounts still parse.
`anchor build` then `pnpm codama:js` regenerates the client (instruction
builder, decoder, audit PDA finder, `Audit` decoder).

**Blocked by:** 01 (program source lives on the merged branch)

**Status:** ready-for-agent

- [ ] `certify_batch` rejects non-designated signers (`NotDesignatedAuditor`) and non-`Created` batches (`AlreadyCertified`)
- [ ] `audit` PDA seeds `["audit", batch]`; stores `audit_hash`, `esg_approved`, `eu_assessment`, `certified_slot`, `bump`
- [ ] `batch.status` becomes `Audited` only on success
- [ ] `anchor build` and `pnpm codama:js` green; generated client exposes certify builder/decoder/PDA finder
- [ ] New error variants surface in the generated errors module
