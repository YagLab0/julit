import type { ReadonlyUint8Array } from "@solana/kit";

/** Storage conventions for audit certificates: `<pda>/<sha256>.pdf`. */
export const CERTIFICATES_BUCKET = "audit-certificates";

export function certificatePath(pda: string, digest: string): string {
  return `${pda}/${digest}.pdf`;
}

export function bytesToHex(bytes: ReadonlyUint8Array | ArrayBuffer): string {
  const view = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  return Array.from(view)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
