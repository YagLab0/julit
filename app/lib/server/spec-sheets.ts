import type { ReadonlyUint8Array } from "@solana/kit";

/** Storage conventions for lot spec sheets: `<producer_wallet>/<sha256>.pdf`.
 *  The bucket id predates the spec-sheet rename — renaming it would orphan
 *  the already-stored PDFs. */
export const SPEC_SHEETS_BUCKET = "plant-certificates";
export const SPEC_SHEET_MAX_BYTES = 50 * 1024 * 1024;

export function specSheetPath(producerWallet: string, digest: string): string {
  return `${producerWallet}/${digest}.pdf`;
}

export function bytesToHex(bytes: ReadonlyUint8Array | ArrayBuffer): string {
  const view = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  return Array.from(view)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
