import type { ReadonlyUint8Array } from "@solana/kit";

/** Storage conventions for plant certificates: `<producer_wallet>/<sha256>.pdf`. */
export const CERTIFICATES_BUCKET = "plant-certificates";
export const PLANT_CERTIFICATE_MAX_BYTES = 50 * 1024 * 1024;

export function plantCertificatePath(
  producerWallet: string,
  digest: string
): string {
  return `${producerWallet}/${digest}.pdf`;
}

export function bytesToHex(bytes: ReadonlyUint8Array | ArrayBuffer): string {
  const view = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  return Array.from(view)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
