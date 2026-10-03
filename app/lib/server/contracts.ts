import {
  address,
  getAddressEncoder,
  getBase58Encoder,
  isAddress,
  signatureBytes,
  verifySignature,
  type ReadonlyUint8Array,
} from "@solana/kit";

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CONTRACT_SIGNATURE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

export type ContractAgreementParams = {
  producerWallet: string;
  counterpartyWallet: string;
  initiatorWallet: string;
  timestamp: string;
};

/**
 * Builds the canonical commercial contract agreement string that must be
 * signed by wallet holders (ADR-0009).
 */
export function buildContractAgreementMessage({
  producerWallet,
  counterpartyWallet,
  initiatorWallet,
  timestamp,
}: ContractAgreementParams): string {
  return [
    "JuLit Commercial Agreement",
    `Producer: ${producerWallet}`,
    `Counterparty: ${counterpartyWallet}`,
    `Initiator: ${initiatorWallet}`,
    `Timestamp: ${timestamp}`,
  ].join("\n");
}

/**
 * Cryptographically verifies an Ed25519 signature over a canonical message
 * using the signer's public key address.
 */
export async function verifyContractSignature(
  walletAddress: string,
  message: string,
  signatureBase58: string
): Promise<boolean> {
  if (!isAddress(walletAddress)) {
    return false;
  }

  let publicKeyBytes: ReadonlyUint8Array<ArrayBuffer>;
  let decodedSignature: ReadonlyUint8Array;

  try {
    publicKeyBytes = getAddressEncoder().encode(address(walletAddress));
    decodedSignature = getBase58Encoder().encode(signatureBase58);
  } catch {
    return false;
  }

  if (decodedSignature.length !== 64) {
    return false;
  }

  try {
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
  } catch {
    return false;
  }
}
