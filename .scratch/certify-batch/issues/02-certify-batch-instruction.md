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

**Status:** done

- [x] `certify_batch` rejects non-designated signers (`NotDesignatedAuditor`) and non-`Created` batches (`AlreadyCertified`)
- [x] `audit` PDA seeds `["audit", batch]`; stores `audit_hash`, `esg_approved`, `eu_assessment`, `certified_slot`, `bump`
- [x] `batch.status` becomes `Audited` only on success
- [x] `anchor build` and `pnpm codama:js` green; generated client exposes certify builder/decoder/PDA finder
- [x] New error variants surface in the generated errors module

**Note:** `anchor build` rewrites `declare_id!` from the deploy keypair at
`anchor/target/deploy/julit-keypair.json` (gitignored). This checkout lacks the
real keypair, so the artifacts were produced with `cargo build-sbf` +
`anchor idl build` to keep `declare_id!` = `D3aKAxF8…`. On the colleague's
machine the real keypair is already present and plain `anchor build` stays in
sync. Also fixed: `anchor-build`/`anchor-test` scripts used `--ignore-keys`,
which anchor-cli 0.32.1 rejects.
