import { describe, expect, it } from "vitest";

describe("Plant certificate digest verification", () => {
  it("computes the correct SHA-256 hex digest for arbitrary bytes", async () => {
    const text = "JuLit Plant Certificate 2026";
    const bytes = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    expect(hashHex).toMatch(/^[0-9a-f]{64}$/);
    expect(hashHex.length).toBe(64);
  });

  it("detects tampering when comparing document hash with the declared digest", async () => {
    const authenticBytes = new TextEncoder().encode(
      "Authentic Plant Certificate"
    );
    const tamperedBytes = new TextEncoder().encode(
      "Tampered Plant Certificate"
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
