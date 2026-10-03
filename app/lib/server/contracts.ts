import {
  address,
  getAddressEncoder,
  getBase58Encoder,
  isAddress,
  signatureBytes,
  verifySignature,
  type ReadonlyUint8Array,
} from "@solana/kit";

export {
  UUID_PATTERN,
  CONTRACT_SIGNATURE_PATTERN,
  buildContractAgreementMessage,
  type ContractAgreementParams,
} from "../contracts";

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
