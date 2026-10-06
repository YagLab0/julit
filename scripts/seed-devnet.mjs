#!/usr/bin/env node
// Provisions Solana Devnet for the JULIT demo:
//   1. airdrops SOL to the admin key and every --wallet
//   2. creates the dUSDC mint (6 decimals, admin is mint authority)
//   3. creates each wallet's dUSDC ATA and mints a demo balance
//   4. calls `initialize` on the JuLit program (Config PDA)
//
// Re-runs are safe: the mint and Config are reused from .devnet-seed.json.
//
//   node scripts/seed-devnet.mjs --wallet <buyer> --wallet <producer> \
//     [--keypair ~/.config/solana/id.json] [--usdc 500000] [--sol 1]

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

import {
  AccountRole,
  address,
  createKeyPairSignerFromBytes,
  getAddressEncoder,
  getProgramDerivedAddress,
} from "@solana/kit";
import { createClient } from "@solana/kit-client-rpc";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_FILE = join(root, ".devnet-seed.json");
const IDL_FILE = join(root, "anchor", "target", "idl", "julit.json");
const DEVNET_RPC = "https://api.devnet.solana.com";

const args = process.argv.slice(2);
const wallets = [];
let keypairPath = join(homedir(), ".config", "solana", "id.json");
let usdcAmount = "500000";
let solAmount = "1";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--wallet") wallets.push(args[++i]);
  else if (args[i] === "--keypair") keypairPath = args[++i];
  else if (args[i] === "--usdc") usdcAmount = args[++i];
  else if (args[i] === "--sol") solAmount = args[++i];
}

if (!existsSync(keypairPath)) {
  console.error(`Admin keypair not found at ${keypairPath}.`);
  console.error("Pass --keypair <path> or run `solana-keygen new`.");
  process.exit(1);
}

const cli = (bin, cliArgs, opts = {}) =>
  execFileSync(bin, cliArgs, { encoding: "utf8", ...opts }).trim();

const loadState = () =>
  existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : {};
const saveState = (state) =>
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");

const state = loadState();
const adminSecret = new Uint8Array(
  JSON.parse(readFileSync(keypairPath, "utf8"))
);
const admin = await createKeyPairSignerFromBytes(adminSecret);
console.log(`Admin: ${admin.address}`);

function airdrop(target) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      cli("solana", [
        "airdrop",
        solAmount,
        target,
        "--url",
        DEVNET_RPC,
        "--commitment",
        "confirmed",
      ]);
      console.log(`  airdropped ${solAmount} SOL to ${target}`);
      return;
    } catch {
      if (attempt === 3)
        console.warn(
          `  airdrop to ${target} failed (rate limit?) — continuing`
        );
      else execFileSync("sleep", ["5"]);
    }
  }
}

console.log("\n== SOL airdrops ==");
airdrop(admin.address);
for (const w of wallets) airdrop(w);

console.log("\n== dUSDC mint ==");
let usdcMint = state.usdcMint;
if (usdcMint) {
  try {
    cli("spl-token", ["supply", usdcMint, "--url", DEVNET_RPC]);
    console.log(`  reusing mint ${usdcMint}`);
  } catch {
    usdcMint = null;
  }
}
if (!usdcMint) {
  const out = JSON.parse(
    cli("spl-token", [
      "create-token",
      "--decimals",
      "6",
      "--url",
      DEVNET_RPC,
      "--fee-payer",
      keypairPath,
      "--mint-authority",
      keypairPath,
      "--output",
      "json",
    ])
  );
  usdcMint = out.address ?? out.commandOutput?.address;
  if (!usdcMint) throw new Error("create-token gave no address");
  console.log(`  created mint ${usdcMint}`);
  state.usdcMint = usdcMint;
  saveState(state);
}

console.log("\n== dUSDC accounts ==");
for (const w of wallets) {
  let ata;
  try {
    const out = JSON.parse(
      cli("spl-token", [
        "create-account",
        usdcMint,
        "--owner",
        w,
        "--fee-payer",
        keypairPath,
        "--url",
        DEVNET_RPC,
        "--output",
        "json",
      ])
    );
    ata = out.address ?? out.commandOutput?.address;
  } catch {
    // Already exists — derive it instead of trusting CLI output.
    const [derived] = await getProgramDerivedAddress({
      programAddress: address("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
      seeds: [
        getAddressEncoder().encode(address(w)),
        getAddressEncoder().encode(
          address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
        ),
        getAddressEncoder().encode(address(usdcMint)),
      ],
    });
    ata = derived;
  }
  cli("spl-token", [
    "mint",
    usdcMint,
    usdcAmount,
    ata,
    "--url",
    DEVNET_RPC,
    "--fee-payer",
    keypairPath,
    "--mint-authority",
    keypairPath,
  ]);
  console.log(`  ${usdcAmount} dUSDC → ${w} (${ata})`);
}

console.log("\n== JuLit Config ==");
const idl = JSON.parse(readFileSync(IDL_FILE, "utf8"));
const programId = address(idl.address ?? idl.metadata?.address);
const [configPda] = await getProgramDerivedAddress({
  programAddress: programId,
  seeds: [new TextEncoder().encode("config")],
});

const rpc = createClient({ url: DEVNET_RPC, payer: admin }).rpc;
const existing = await rpc
  .getAccountInfo(configPda, { encoding: "base64", commitment: "confirmed" })
  .send();

if (existing.value) {
  console.log(`  Config already initialized at ${configPda}`);
} else {
  const initialize = idl.instructions.find((i) => i.name === "initialize");
  const discriminator = new Uint8Array(initialize.discriminator);

  const data = new Uint8Array(8 + 2 + 32 + 32 + 8 + 8);
  data.set(discriminator, 0);
  const view = new DataView(data.buffer);
  view.setUint16(8, 250, true); // fee_bps = 2.5%
  data.set(getAddressEncoder().encode(address(usdcMint)), 10);
  data.set(getAddressEncoder().encode(admin.address), 42); // treasury = admin
  view.setBigInt64(74, 86400n, true); // claim_min_secs = 1 day
  view.setBigInt64(82, 2592000n, true); // claim_max_secs = 30 days

  const client = createClient({ url: DEVNET_RPC, payer: admin });
  const result = await client.sendTransaction([
    {
      programAddress: programId,
      accounts: [
        { address: configPda, role: AccountRole.WRITABLE },
        { address: admin.address, role: AccountRole.WRITABLE_SIGNER },
        {
          address: address("11111111111111111111111111111111"),
          role: AccountRole.READONLY,
        },
      ],
      data,
    },
  ]);
  console.log(`  Config initialized at ${configPda}`);
  console.log(`  tx: ${result.context.signature}`);
}

saveState({ ...state, usdcMint, configPda });
console.log(`\nDone. State saved to ${STATE_FILE}`);
