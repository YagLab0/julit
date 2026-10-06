import { describe, expect, it } from "vitest";
import { LotStatus, JULIT_PROGRAM_ADDRESS } from "../generated/julit";
import {
  certificateVerdict,
  contrastLotRecord,
  passportPath,
  scaledDecimal,
  type ContrastField,
  type IndexedLot,
  type OnChainLot,
} from "./verification";

const PLANT_CERT = "a".repeat(64);
const CLAIMABLE_ISO = "2026-11-15T00:00:00.000Z";
const CLAIMABLE_SECS = BigInt(Math.trunc(Date.parse(CLAIMABLE_ISO) / 1000));

const INDEXED: IndexedLot = {
  pda_address: "LotPda111111111111111111111111111111111111",
  lot_id: "LIT-2026-CNR-01",
  producer_wallet: "ProducerWallet111111111111111111111111111",
  buyer_wallet: "BuyerWallet111111111111111111111111111111",
  mint_address: "MintPda111111111111111111111111111111111111",
  origin_id: "condor",
  status: "listed",
  claimable_after: CLAIMABLE_ISO,
  plant_cert_sha256: PLANT_CERT,
  volume_tonnes: "120",
  purity_pct: "99.52",
  water_footprint_m3_per_tonne: "38.75",
  carbon_footprint_kg_co2e_per_tonne: "4120.5",
};

function account(
  data: Partial<OnChainLot["data"]> = {},
  programAddress: string = JULIT_PROGRAM_ADDRESS
): OnChainLot {
  return {
    programAddress,
    data: {
      lotId: "LIT-2026-CNR-01",
      originId: "condor",
      producer: "ProducerWallet111111111111111111111111111",
      buyer: "BuyerWallet111111111111111111111111111111",
      mint: "MintPda111111111111111111111111111111111111",
      volumeTonnes: 120n,
      purityBasisPoints: 9952n,
      waterM3PerTonneScaled: 3875n,
      carbonKgCo2ePerTonneScaled: 412050n,
      claimableAfter: CLAIMABLE_SECS,
      plantCertHash: new Uint8Array(32).fill(0xaa),
      status: LotStatus.Listed,
      ...data,
    },
  };
}

function contrast(overrides: {
  indexed?: Partial<IndexedLot>;
  derivedPda?: string;
  account?: OnChainLot | null;
}) {
  return contrastLotRecord({
    indexed: { ...INDEXED, ...overrides.indexed },
    derivedPda: overrides.derivedPda ?? INDEXED.pda_address,
    account: overrides.account === undefined ? account() : overrides.account,
  });
}

function mismatch(fields: ContrastField[]) {
  return { state: "mismatch", fields } as const;
}

describe("contrastLotRecord", () => {
  it("returns verified when every field matches", () => {
    expect(contrast({})).toEqual({ state: "verified" });
  });

  it("accepts index decimals arriving as numbers", () => {
    expect(
      contrast({
        indexed: {
          volume_tonnes: 120,
          purity_pct: 99.52,
          water_footprint_m3_per_tonne: 38.75,
          carbon_footprint_kg_co2e_per_tonne: 4120.5,
        },
      })
    ).toEqual({ state: "verified" });
  });

  it("names lotId when the on-chain lot id differs", () => {
    expect(
      contrast({ account: account({ lotId: "LIT-2026-CNR-02" }) })
    ).toEqual(mismatch(["lotId"]));
  });

  it("names producer when the on-chain producer differs", () => {
    expect(
      contrast({
        account: account({
          producer: "OtherWallet111111111111111111111111111111",
        }),
      })
    ).toEqual(mismatch(["producer"]));
  });

  it("names buyer when the designated buyer differs", () => {
    expect(
      contrast({
        account: account({
          buyer: "OtherBuyer11111111111111111111111111111111",
        }),
      })
    ).toEqual(mismatch(["buyer"]));
  });

  it("names mint when the Digital Title mint differs", () => {
    expect(
      contrast({
        account: account({
          mint: "OtherMint1111111111111111111111111111111111",
        }),
      })
    ).toEqual(mismatch(["mint"]));
  });

  it("names origin when the on-chain origin differs", () => {
    expect(contrast({ account: account({ originId: "pena_blanca" }) })).toEqual(
      mismatch(["origin"])
    );
  });

  it("names volume when the on-chain volume differs", () => {
    expect(contrast({ account: account({ volumeTonnes: 121n }) })).toEqual(
      mismatch(["volume"])
    );
  });

  it("names purity when the on-chain purity differs", () => {
    expect(
      contrast({ account: account({ purityBasisPoints: 9953n }) })
    ).toEqual(mismatch(["purity"]));
  });

  it("names water when the on-chain water footprint differs", () => {
    expect(
      contrast({ account: account({ waterM3PerTonneScaled: 3876n }) })
    ).toEqual(mismatch(["water"]));
  });

  it("names carbon when the on-chain carbon footprint differs", () => {
    expect(
      contrast({
        account: account({ carbonKgCo2ePerTonneScaled: 412051n }),
      })
    ).toEqual(mismatch(["carbon"]));
  });

  it("names claimableAfter when the deadline differs", () => {
    expect(
      contrast({
        account: account({ claimableAfter: CLAIMABLE_SECS + 60n }),
      })
    ).toEqual(mismatch(["claimableAfter"]));
  });

  it("names plantCertHash when the certificate digest differs", () => {
    expect(
      contrast({
        account: account({ plantCertHash: new Uint8Array(32).fill(0xbb) }),
      })
    ).toEqual(mismatch(["plantCertHash"]));
  });

  it("names status when the on-chain status differs", () => {
    expect(
      contrast({ account: account({ status: LotStatus.Funded }) })
    ).toEqual(mismatch(["status"]));
  });

  it("names status for an unknown on-chain status value", () => {
    expect(contrast({ account: account({ status: 99 }) })).toEqual(
      mismatch(["status"])
    );
  });

  it("names pda when the derived address differs from the indexed one", () => {
    expect(
      contrast({ derivedPda: "OtherPda1111111111111111111111111111111111" })
    ).toEqual(mismatch(["pda"]));
  });

  it("names programAddress when the account belongs to another programme", () => {
    expect(
      contrast({
        account: account({}, "OtherProgram11111111111111111111111111111"),
      })
    ).toEqual(mismatch(["programAddress"]));
  });

  it("names every differing field", () => {
    expect(
      contrast({
        account: account({ lotId: "X", status: LotStatus.Redeemed }),
      })
    ).toEqual(mismatch(["lotId", "status"]));
  });

  it("returns missing when the account does not exist at the derived PDA", () => {
    expect(contrast({ account: null })).toEqual({ state: "missing" });
  });

  it("reports the pda mismatch instead of missing when derivation disagrees", () => {
    expect(
      contrast({
        account: null,
        derivedPda: "OtherPda1111111111111111111111111111111111",
      })
    ).toEqual(mismatch(["pda"]));
  });
});

describe("decimal exactness", () => {
  it('treats "99.5" and "99.50" as the same 9950 basis points', () => {
    for (const purity_pct of ["99.5", "99.50", 99.5]) {
      expect(
        contrast({
          indexed: { purity_pct },
          account: account({ purityBasisPoints: 9950n }),
        })
      ).toEqual({ state: "verified" });
    }
  });

  it('parses "1.000000" to the scaled integer 1000000 at scale 6', () => {
    expect(scaledDecimal("1.000000", 6)).toBe(1000000n);
  });

  it("keeps u64-boundary values exact", () => {
    const max = "18446744073709551615";
    expect(scaledDecimal(max, 0)).toBe(18446744073709551615n);
    expect(
      contrast({
        indexed: { volume_tonnes: max },
        account: account({ volumeTonnes: 18446744073709551615n }),
      })
    ).toEqual({ state: "verified" });
  });

  it("never matches with more decimals than the multiplier keeps", () => {
    expect(contrast({ indexed: { purity_pct: "99.520" } })).toEqual(
      mismatch(["purity"])
    );
  });

  it("rejects non-numeric and negative input as non-matching", () => {
    expect(scaledDecimal("abc", 2)).toBeNull();
    expect(scaledDecimal("-1", 2)).toBeNull();
    expect(scaledDecimal("1e3", 2)).toBeNull();
  });
});

describe("certificateVerdict", () => {
  const hexA = "a".repeat(64);
  const hexB = "b".repeat(64);

  it("returns match for equal hex", () => {
    expect(certificateVerdict(hexA, hexA)).toBe("match");
  });

  it("returns match for equal hex in either case", () => {
    expect(certificateVerdict(hexA, hexA.toUpperCase())).toBe("match");
    expect(certificateVerdict(hexA.toUpperCase(), hexA)).toBe("match");
  });

  it("returns mismatch for any difference", () => {
    expect(certificateVerdict(hexA, hexB)).toBe("mismatch");
    expect(certificateVerdict(hexA, `${hexA.slice(0, 63)}b`)).toBe("mismatch");
  });

  it("returns mismatch for malformed computed hex", () => {
    expect(certificateVerdict(hexA, "not-hex")).toBe("mismatch");
    expect(certificateVerdict(hexA, hexA.slice(0, 63))).toBe("mismatch");
    expect(certificateVerdict(hexA, `${hexA}ff`)).toBe("mismatch");
    expect(certificateVerdict(hexA, "")).toBe("mismatch");
  });
});

describe("passportPath", () => {
  it("derives the passport route from the lot PDA", () => {
    expect(passportPath(INDEXED.pda_address)).toBe(
      `/batch/${INDEXED.pda_address}`
    );
  });
});
