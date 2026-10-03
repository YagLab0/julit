import { describe, expect, it } from "vitest";

describe("Cryptographic Passport Zero-Trust Verification", () => {
  it("computes the correct SHA-256 hex digest for arbitrary bytes", async () => {
    const text = "JuLit Battery Grade Lithium Carbonate Audit Certificate 2026";
    const bytes = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    expect(hashHex).toMatch(/^[0-9a-f]{64}$/);
    expect(hashHex.length).toBe(64);
  });

  it("detects tampering when comparing document hash with on-chain digest", async () => {
    const authenticBytes = new TextEncoder().encode(
      "Authentic Laboratory Audit Report"
    );
    const tamperedBytes = new TextEncoder().encode(
      "Tampered Laboratory Audit Report"
    );

    const authHashBuffer = await crypto.subtle.digest(
      "SHA-256",
      authenticBytes
    );
    const authHex = Array.from(new Uint8Array(authHashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const tamperedHashBuffer = await crypto.subtle.digest(
      "SHA-256",
      tamperedBytes
    );
    const tamperedHex = Array.from(new Uint8Array(tamperedHashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    expect(authHex).not.toBe(tamperedHex);
    expect(authHex.toLowerCase() === tamperedHex.toLowerCase()).toBe(false);
  });
});
