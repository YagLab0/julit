import { createClient } from "@supabase/supabase-js";
import {
  address,
  getAddressDecoder,
  getAddressEncoder,
  getBase58Decoder,
  getBase58Encoder,
  signatureBytes,
  verifySignature,
} from "@solana/kit";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

function buildContractAgreementMessage({
  producerWallet,
  counterpartyWallet,
  initiatorWallet,
  timestamp,
}) {
  return [
    "JuLit Commercial Agreement",
    `Producer: ${producerWallet}`,
    `Counterparty: ${counterpartyWallet}`,
    `Initiator: ${initiatorWallet}`,
    `Timestamp: ${timestamp}`,
  ].join("\n");
}

async function verifyContractSignature(
  walletAddress,
  message,
  signatureBase58
) {
  const publicKeyBytes = getAddressEncoder().encode(address(walletAddress));
  const decodedSignature = getBase58Encoder().encode(signatureBase58);

  const key = await crypto.subtle.importKey(
    "raw",
    publicKeyBytes.buffer,
    { name: "Ed25519" },
    false,
    ["verify"]
  );

  return await verifySignature(
    key,
    signatureBytes(decodedSignature),
    new TextEncoder().encode(message)
  );
}

async function main() {
  console.log(
    "=== Testing Bilateral Contracts and Batch Showcase Workflow ==="
  );

  const service = createClient(SUPABASE_URL, SERVICE_KEY);
  const anon = createClient(SUPABASE_URL, ANON_KEY);

  // 1. Verify batches seeded and public catalogue
  console.log("\n1. Verifying public catalogue batches...");
  const { data: batches, error: batchErr } = await anon
    .from("batches")
    .select(
      "batch_id, pda_address, origin_id, volume_tonnes, purity_pct, price_usdc, status, reserved_buyer_wallet"
    )
    .order("batch_id");

  if (batchErr || !batches || batches.length === 0) {
    throw new Error(`Failed to load batches: ${batchErr?.message}`);
  }
  console.log(`✓ Loaded ${batches.length} batches from public catalogue:`);
  batches.forEach((b) => {
    console.log(
      `  - ${b.batch_id} (${b.origin_id}): ${b.volume_tonnes} t, ${b.purity_pct}% Li2CO3, status: ${b.status}, reserved: ${b.reserved_buyer_wallet ?? "none"}`
    );
  });

  const pbl02 = batches.find((b) => b.batch_id === "LIT-2026-PBL-02");
  if (!pbl02) throw new Error("Batch LIT-2026-PBL-02 not found");
  if (!pbl02.reserved_buyer_wallet)
    throw new Error("LIT-2026-PBL-02 should be reserved");

  // 2. Verify Buyer account and contracts
  console.log("\n2. Verifying Buyer account and accepted contract...");
  const buyerEmail = "comprador@julit.dev";
  const { data: authData, error: authErr } = await anon.auth.signInWithPassword(
    {
      email: buyerEmail,
      password: "julit-demo-2026",
    }
  );
  if (authErr || !authData.user) {
    throw new Error(`Buyer sign-in failed: ${authErr?.message}`);
  }
  console.log(`✓ Buyer signed in: ${authData.user.id}`);

  const { data: buyerCompany } = await service
    .from("companies")
    .select("id, name, wallet_address, company_type")
    .eq("id", authData.user.id)
    .single();

  if (!buyerCompany || !buyerCompany.wallet_address) {
    throw new Error("Buyer company or wallet not found");
  }
  console.log(
    `✓ Buyer company: ${buyerCompany.name}, wallet: ${buyerCompany.wallet_address}`
  );

  // Check buyer contract with Producer 1
  const { data: contracts, error: contractErr } = await service
    .from("company_contracts")
    .select(
      `
      id,
      producer_id,
      counterparty_id,
      initiator_id,
      status,
      producer:companies!company_contracts_producer_id_fkey(name, wallet_address, origin_id)
    `
    )
    .eq("counterparty_id", buyerCompany.id);

  if (contractErr || !contracts) {
    throw new Error(`Failed to load contracts: ${contractErr?.message}`);
  }
  console.log(`✓ Buyer has ${contracts.length} contract(s):`);
  contracts.forEach((c) => {
    console.log(
      `  - Contract with ${c.producer.name} (${c.producer.origin_id}): status ${c.status}`
    );
  });

  const acceptedContract = contracts.find((c) => c.status === "accepted");
  if (!acceptedContract) {
    throw new Error("Expected accepted contract between Buyer and Producer");
  }
  console.log(
    "✓ Contract is accepted, authorizing purchase of reserved batch."
  );

  // 3. Cryptographic signature verification test
  console.log("\n3. Testing Ed25519 bilateral contract signing...");
  const keyPair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
    "verify",
  ]);
  const pubRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", keyPair.publicKey)
  );
  const testWallet = getAddressDecoder().decode(pubRaw);
  const timestamp = new Date().toISOString();

  const msg = buildContractAgreementMessage({
    producerWallet: acceptedContract.producer.wallet_address,
    counterpartyWallet: testWallet,
    initiatorWallet: testWallet,
    timestamp,
  });

  const sigBytes = new Uint8Array(
    await crypto.subtle.sign(
      "Ed25519",
      keyPair.privateKey,
      new TextEncoder().encode(msg)
    )
  );
  const sigB58 = getBase58Decoder().decode(sigBytes);

  const isVerified = await verifyContractSignature(testWallet, msg, sigB58);
  if (!isVerified) throw new Error("Ed25519 signature verification failed");
  console.log(
    `✓ Generated and verified Ed25519 signature: ${sigB58.slice(0, 16)}...`
  );

  // 4. Test Simulated Settlement Purchase
  console.log(
    "\n4. Testing simulated purchase settlement for reserved batch..."
  );
  const simulatedSignature = Array.from(
    { length: 88 },
    () =>
      "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[
        Math.floor(Math.random() * 58)
      ]
  ).join("");

  const { data: updatedBatch, error: updateErr } = await service
    .from("batches")
    .update({
      status: "completed",
      buyer_wallet: buyerCompany.wallet_address,
      completion_tx_signature: simulatedSignature,
    })
    .eq("pda_address", pbl02.pda_address)
    .select()
    .single();

  if (updateErr || !updatedBatch) {
    throw new Error(`Failed to complete batch: ${updateErr?.message}`);
  }
  console.log(
    `✓ Batch ${updatedBatch.batch_id} purchased under simulated settlement!`
  );
  console.log(`  - Status: ${updatedBatch.status}`);
  console.log(`  - Buyer wallet: ${updatedBatch.buyer_wallet}`);
  console.log(
    `  - Tx Signature: ${updatedBatch.completion_tx_signature.slice(0, 16)}...`
  );

  // 5. Verify batch in buyer portfolio
  console.log("\n5. Verifying batch appears in buyer portfolio...");
  const { data: portfolioBatches } = await service
    .from("batches")
    .select(
      "batch_id, volume_tonnes, purity_pct, price_usdc, status, buyer_wallet"
    )
    .eq("buyer_wallet", buyerCompany.wallet_address)
    .eq("status", "completed");

  if (!portfolioBatches || portfolioBatches.length === 0) {
    throw new Error("Batch did not appear in buyer portfolio");
  }
  console.log(
    `✓ Buyer portfolio contains ${portfolioBatches.length} completed batch(es):`
  );
  portfolioBatches.forEach((b) => {
    console.log(
      `  - ${b.batch_id}: ${b.volume_tonnes} t, ${b.price_usdc} USDC`
    );
  });

  console.log(
    "\n=== ALL E2E CONTRACT AND BATCH TESTS PASSED SUCCESSFULLY! ==="
  );
}

main().catch((err) => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
