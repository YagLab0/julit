# certify-batch — deploy & smoke-test runbook

Everything is committed on `audit-features`. The on-chain upgrade must run on
the machine that holds the upgrade authority (`EwpCo293GQT8X6dpiLFdfvbu1wRLCheUDB4WmuPEXbyF`)
and the deploy keypair `anchor/target/deploy/julit-keypair.json` (gitignored —
it already exists on the machine that deployed `D3aKAxF8…`; do NOT regenerate it).

## 1. Check out the branch

```bash
git fetch && git checkout audit-features && git pull
pnpm install
```

## 2. Anchor toolchain (the program pins anchor-lang = "=0.32.1")

```bash
avm install 0.32.1 && avm use 0.32.1
anchor --version   # must print 0.32.1
```

## 3. Build and verify BEFORE deploying

```bash
pnpm anchor-build
head -4 anchor/programs/julit/src/lib.rs
# declare_id! must still be D3aKAxF8NEU7iADrc9E7GrM2NZnn3qFfkev4mKE1nhxg

anchor keys list
# julit: D3aKAxF8… — confirms the deploy keypair is the right one
```

STOP if `anchor keys list` shows another address: `julit-keypair.json` is
missing or wrong — deploying would push the program to a new address and break
every PDA/index reference. Restore the real keypair file first.

## 4. Deploy the upgrade

```bash
cd anchor && anchor deploy
```

The wallet configured in `Anchor.toml` (`~/.config/solana/id.json`) must be the
upgrade authority and needs devnet SOL for the deploy.

## 5. End-to-end test

```bash
pnpm dev
```

- Sign in as the Auditor Demo account → `/audit` shows the two real `created`
  batches (`LIT-2026-CONDOR-02`, `LIT-2026-CONDOR-04` from Minera Cóndor).
- Connect the verified auditor wallet (`Hj8tdxSg…` — the same wallet recorded
  as `auditor` in the on-chain batches).
- Open a batch → upload a PDF → declare ESG + EU assessment → "Certificar lote".
- Expected flow: Subiendo… → Firmando… (wallet signature) → Indexando… →
  success toast with an Explorer link → back to `/audit`, batch moves to the
  certified section with its findings.

## 6. On-chain sanity check (optional)

```bash
solana account <audit-pda> --url devnet
```

The `audit_hash` field in that account must match the certificate's SHA-256 —
that comparison is the forgery check this design enables.

## Troubleshooting

- **Custom program error at signing** → the old program is still deployed
  (step 4 did not run, or deployed to a different address).
- **"Este lote no está designado a tu wallet"** → connected wallet ≠ the
  batch's designated `auditor`.
- **Upload 409** → that exact PDF was already uploaded; certify it or use a
  different file.
- **Index 400 "hash no coincide"** → the uploaded certificate is not the file
  the transaction signed (not reachable through the normal UI).
- **`anchor build` fails parsing `edition2024`** → platform-tools rust too old;
  this machine was fixed by switching to Solana CLI 3.1.10 + platform-tools
  1.52 (`cargo build-sbf` installs them automatically).

## Notes

- Existing `created` batches certify without migration — `Batch` layout is
  unchanged; the audit record lives in a separate PDA (`["audit", batch]`).
- `pnpm codama:js` only needs a rerun if the IDL changes; the generated client
  is already committed.
