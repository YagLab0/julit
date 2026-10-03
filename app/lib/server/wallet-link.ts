import {
  address,
  getAddressEncoder,
  getBase58Encoder,
  signatureBytes,
  verifySignature,
  type ReadonlyUint8Array,
} from "@solana/kit";

export const WALLET_LINK_CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const WALLET_LINK_NONCE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const SOLANA_WALLET_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const SIGNATURE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

export type WalletLinkChallenge = {
  accountEmail: string;
  domain: string;
  walletAddress: string;
  nonce: string;
  /** ISO 8601 with millisecond precision, as stored in the challenge row. */
  issuedAt: string;
  /** ISO 8601 with millisecond precision, as stored in the challenge row. */
  expiresAt: string;
};

/**
 * The exact message the wallet signs. It is always rebuilt from the stored
 * challenge row, never from client-submitted text (ADR-0005).
 */
export function buildWalletLinkMessage(challenge: WalletLinkChallenge): string {
  return [
    "JuLit: vinculación de wallet",
    "",
    `Cuenta: ${challenge.accountEmail}`,
    `Sitio: ${challenge.domain}`,
    `Wallet: ${challenge.walletAddress}`,
    `Nonce: ${challenge.nonce}`,
    `Emitido: ${challenge.issuedAt}`,
    `Expira: ${challenge.expiresAt}`,
  ].join("\n");
}

export async function verifyWalletLinkSignature(
  walletAddress: string,
  message: string,
  signatureBase58: string
): Promise<boolean> {
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

  const key = await crypto.subtle.importKey(
    "raw",
    publicKeyBytes.buffer,
    { name: "Ed25519" },
    false,
    ["verify"]
  );

  return verifySignature(
    key,
    signatureBytes(decodedSignature),
    new TextEncoder().encode(message)
  );
}
