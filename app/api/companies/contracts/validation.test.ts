import { describe, expect, it } from "vitest";
import { getAddressDecoder, getBase58Decoder } from "@solana/kit";
import {
  buildContractAgreementMessage,
  verifyContractSignature,
  UUID_PATTERN,
  CONTRACT_SIGNATURE_PATTERN,
} from "../../../lib/server/contracts";

describe("buildContractAgreementMessage", () => {
  it("generates deterministic canonical contract message", () => {
    const msg = buildContractAgreementMessage({
      producerWallet: "ProdSaLesdeLALtipLano111111111111111111111",
      counterpartyWallet: "C1ienteTesaEnergy3333333333333333333333333",
      initiatorWallet: "C1ienteTesaEnergy3333333333333333333333333",
      timestamp: "2026-10-03T15:00:00.000Z",
    });

    expect(msg).toBe(
      "JuLit Commercial Agreement\n" +
        "Producer: ProdSaLesdeLALtipLano111111111111111111111\n" +
        "Counterparty: C1ienteTesaEnergy3333333333333333333333333\n" +
        "Initiator: C1ienteTesaEnergy3333333333333333333333333\n" +
        "Timestamp: 2026-10-03T15:00:00.000Z"
    );
  });
});

describe("verifyContractSignature", () => {
  it("rejects non-base58 or malformed wallet addresses", async () => {
    const valid = await verifyContractSignature(
      "not-a-valid-address!",
      "test message",
      "5VERv8NMvzbJMEdV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUc"
    );
    expect(valid).toBe(false);
  });

  it("rejects invalid signature length", async () => {
    const valid = await verifyContractSignature(
      "ProdMineraCondor222222222222222222222222",
      "test message",
      "shortsig"
    );
    expect(valid).toBe(false);
  });

  it("validates authentic Ed25519 signatures and rejects tampered messages", async () => {
    const keyPair = (await crypto.subtle.generateKey(
      { name: "Ed25519" },
      true,
      ["sign", "verify"]
    )) as CryptoKeyPair;

    const pubRaw = new Uint8Array(
      await crypto.subtle.exportKey("raw", keyPair.publicKey)
    );
    const solAddress = getAddressDecoder().decode(pubRaw);

    const message = buildContractAgreementMessage({
      producerWallet: solAddress,
      counterpartyWallet: "C1ienteTesaEnergy3333333333333333333333333",
      initiatorWallet: solAddress,
      timestamp: "2026-10-03T15:30:00.000Z",
    });

    const msgBytes = new TextEncoder().encode(message);
    const sigRaw = new Uint8Array(
      await crypto.subtle.sign("Ed25519", keyPair.privateKey, msgBytes)
    );
    const sigB58 = getBase58Decoder().decode(sigRaw);

    // 1. Verify authentic signature succeeds
    const isValid = await verifyContractSignature(solAddress, message, sigB58);
    expect(isValid).toBe(true);

    // 2. Tampered message fails verification
    const tamperedMessage = message.replace("15:30:00", "15:30:01");
    const isTamperedValid = await verifyContractSignature(
      solAddress,
      tamperedMessage,
      sigB58
    );
    expect(isTamperedValid).toBe(false);

    // 3. Different wallet fails verification
    const otherKeyPair = (await crypto.subtle.generateKey(
      { name: "Ed25519" },
      true,
      ["sign", "verify"]
    )) as CryptoKeyPair;
    const otherPubRaw = new Uint8Array(
      await crypto.subtle.exportKey("raw", otherKeyPair.publicKey)
    );
    const otherAddress = getAddressDecoder().decode(otherPubRaw);

    const isOtherAddressValid = await verifyContractSignature(
      otherAddress,
      message,
      sigB58
    );
    expect(isOtherAddressValid).toBe(false);
  });
});

describe("Regex patterns", () => {
  it("validates UUID pattern", () => {
    expect(UUID_PATTERN.test("a1a1a1a1-0000-4000-8000-000000000001")).toBe(
      true
    );
    expect(UUID_PATTERN.test("invalid-uuid")).toBe(false);
  });

  it("validates contract signature pattern", () => {
    expect(
      CONTRACT_SIGNATURE_PATTERN.test(
        "5VERv8NMvzbJMEdV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUc"
      )
    ).toBe(true);
    // Real Solana transaction signatures (88 chars Base58)
    expect(
      CONTRACT_SIGNATURE_PATTERN.test(
        "7VFatVgMW4TzGoBKYQg7E7ggTGzPTjkzS7rDndc7E3hJBQ4dwRweABsSf72wdpdLVNconPGCqin2f8rjrJNUQV6"
      )
    ).toBe(true);
    expect(CONTRACT_SIGNATURE_PATTERN.test("short")).toBe(false);
  });
});
