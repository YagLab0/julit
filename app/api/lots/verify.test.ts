import { describe, expect, it } from "vitest";
import {
  verifyLotCreation,
  verifyLotFunding,
  verifyLotRedemption,
  type VerifyLotCreationInput,
  type VerifyLotFundingInput,
} from "./verify";

const WALLET = "ProducerWallet111111111111111111111111111";
const LOT_PDA = "LotPda111111111111111111111111111111111111";

function base(
  overrides: Partial<VerifyLotCreationInput> = {}
): VerifyLotCreationInput {
  return {
    producerWallet: WALLET,
    expectedLotPda: LOT_PDA,
    transaction: {
      signature: "sig",
      slot: 100,
      failed: false,
      createLotInstruction: { lot: LOT_PDA },
    },
    lotAccount: {
      programOwned: true,
      producer: WALLET,
      buyer: "BuyerWallet11111111111111111111111111111",
      status: "listed",
    },
    ...overrides,
  };
}

describe("verifyLotCreation", () => {
  it("accepts a confirmed create_lot with matching PDA, producer and status", () => {
    expect(verifyLotCreation(base())).toEqual({ ok: true });
  });

  it("rejects a missing transaction", () => {
    const r = verifyLotCreation(base({ transaction: null }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rejection.status).toBe(404);
  });

  it("rejects a failed transaction", () => {
    const r = verifyLotCreation(
      base({
        transaction: {
          signature: "sig",
          slot: 100,
          failed: true,
          createLotInstruction: { lot: LOT_PDA },
        },
      })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rejection.status).toBe(400);
  });

  it("rejects a transaction without a create_lot instruction", () => {
    const r = verifyLotCreation(
      base({
        transaction: {
          signature: "sig",
          slot: 100,
          failed: false,
          createLotInstruction: null,
        },
      })
    );
    expect(r.ok).toBe(false);
  });

  it("rejects an instruction writing a different lot PDA", () => {
    const r = verifyLotCreation(
      base({
        transaction: {
          signature: "sig",
          slot: 100,
          failed: false,
          createLotInstruction: {
            lot: "OtherLot1111111111111111111111111111111",
          },
        },
      })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rejection.status).toBe(400);
  });

  it("rejects a missing or foreign-program lot account", () => {
    for (const lotAccount of [
      null,
      {
        programOwned: false,
        producer: WALLET,
        buyer: "B",
        status: "listed" as const,
      },
    ]) {
      const r = verifyLotCreation(base({ lotAccount }));
      expect(r.ok).toBe(false);
    }
  });

  it("rejects a lot whose producer is not the caller wallet", () => {
    const r = verifyLotCreation(
      base({
        lotAccount: {
          programOwned: true,
          producer: "SomeoneElse11111111111111111111111111",
          buyer: "B",
          status: "listed",
        },
      })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rejection.status).toBe(403);
  });

  it("rejects a lot that did not stay listed", () => {
    const r = verifyLotCreation(
      base({
        lotAccount: {
          programOwned: true,
          producer: WALLET,
          buyer: "B",
          status: "funded",
        },
      })
    );
    expect(r.ok).toBe(false);
  });
});

const BUYER = "BuyerWallet11111111111111111111111111111";

function fundBase(
  overrides: Partial<VerifyLotFundingInput> = {}
): VerifyLotFundingInput {
  return {
    buyerWallet: BUYER,
    lotPda: LOT_PDA,
    indexedStatus: "listed",
    transaction: {
      signature: "sig",
      slot: 100,
      failed: false,
      fundLotInstruction: { lot: LOT_PDA, buyer: BUYER },
    },
    lotAccount: {
      programOwned: true,
      producer: WALLET,
      buyer: BUYER,
      status: "funded",
    },
    ...overrides,
  };
}

describe("verifyLotFunding", () => {
  it("accepts a confirmed fund_lot by the designated buyer", () => {
    expect(verifyLotFunding(fundBase())).toEqual({ ok: true });
  });

  it("rejects a missing or failed transaction", () => {
    expect(verifyLotFunding(fundBase({ transaction: null })).ok).toBe(false);
    const r = verifyLotFunding(
      fundBase({
        transaction: {
          signature: "sig",
          slot: 100,
          failed: true,
          fundLotInstruction: { lot: LOT_PDA, buyer: BUYER },
        },
      })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rejection.status).toBe(400);
  });

  it("rejects a transaction without a fund_lot instruction", () => {
    const r = verifyLotFunding(
      fundBase({
        transaction: {
          signature: "sig",
          slot: 100,
          failed: false,
          fundLotInstruction: null,
        },
      })
    );
    expect(r.ok).toBe(false);
  });

  it("rejects an instruction funding a different lot", () => {
    const r = verifyLotFunding(
      fundBase({
        transaction: {
          signature: "sig",
          slot: 100,
          failed: false,
          fundLotInstruction: {
            lot: "OtherLot1111111111111111111111111",
            buyer: BUYER,
          },
        },
      })
    );
    expect(r.ok).toBe(false);
  });

  it("rejects a funding signed by a different wallet", () => {
    const r = verifyLotFunding(
      fundBase({
        transaction: {
          signature: "sig",
          slot: 100,
          failed: false,
          fundLotInstruction: {
            lot: LOT_PDA,
            buyer: "Impostor1111111111111111111111111",
          },
        },
      })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rejection.status).toBe(403);
  });

  it("rejects when the caller is not the on-chain designated buyer", () => {
    const r = verifyLotFunding(
      fundBase({
        lotAccount: {
          programOwned: true,
          producer: WALLET,
          buyer: "DesignatedOther11111111111111111111111",
          status: "funded",
        },
      })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rejection.status).toBe(403);
  });

  it("rejects when the on-chain status is not funded", () => {
    const r = verifyLotFunding(
      fundBase({
        lotAccount: {
          programOwned: true,
          producer: WALLET,
          buyer: BUYER,
          status: "listed",
        },
      })
    );
    expect(r.ok).toBe(false);
  });

  it("rejects a lot that is not indexed or already moved on", () => {
    expect(verifyLotFunding(fundBase({ indexedStatus: null })).ok).toBe(false);
    const r = verifyLotFunding(fundBase({ indexedStatus: "funded" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rejection.status).toBe(409);
  });
});

function redeemBase(
  overrides: Partial<VerifyLotFundingInput> = {}
): VerifyLotFundingInput {
  return fundBase({
    indexedStatus: "funded",
    lotAccount: {
      programOwned: true,
      producer: WALLET,
      buyer: BUYER,
      status: "redeemed",
    },
    ...overrides,
  });
}

describe("verifyLotRedemption", () => {
  it("accepts a confirmed redeem_lot from funded and from disputed", () => {
    expect(verifyLotRedemption(redeemBase())).toEqual({ ok: true });
    expect(
      verifyLotRedemption(redeemBase({ indexedStatus: "disputed" }))
    ).toEqual({ ok: true });
  });

  it("rejects a missing or failed transaction", () => {
    expect(verifyLotRedemption(redeemBase({ transaction: null })).ok).toBe(
      false
    );
    const r = verifyLotRedemption(
      redeemBase({
        transaction: {
          signature: "sig",
          slot: 100,
          failed: true,
          fundLotInstruction: { lot: LOT_PDA, buyer: BUYER },
        },
      })
    );
    expect(r.ok).toBe(false);
  });

  it("rejects a transaction without a redeem_lot instruction", () => {
    const r = verifyLotRedemption(
      redeemBase({
        transaction: {
          signature: "sig",
          slot: 100,
          failed: false,
          fundLotInstruction: null,
        },
      })
    );
    expect(r.ok).toBe(false);
  });

  it("rejects an instruction redeeming a different lot", () => {
    const r = verifyLotRedemption(
      redeemBase({
        transaction: {
          signature: "sig",
          slot: 100,
          failed: false,
          fundLotInstruction: {
            lot: "OtherLot1111111111111111111111111",
            buyer: BUYER,
          },
        },
      })
    );
    expect(r.ok).toBe(false);
  });

  it("rejects a redemption signed by a different wallet", () => {
    const r = verifyLotRedemption(
      redeemBase({
        transaction: {
          signature: "sig",
          slot: 100,
          failed: false,
          fundLotInstruction: {
            lot: LOT_PDA,
            buyer: "Impostor1111111111111111111111111",
          },
        },
      })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rejection.status).toBe(403);
  });

  it("rejects when the caller is not the on-chain designated buyer", () => {
    const r = verifyLotRedemption(
      redeemBase({
        lotAccount: {
          programOwned: true,
          producer: WALLET,
          buyer: "DesignatedOther11111111111111111111111",
          status: "redeemed",
        },
      })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rejection.status).toBe(403);
  });

  it("rejects when the on-chain status is not redeemed", () => {
    const r = verifyLotRedemption(
      redeemBase({
        lotAccount: {
          programOwned: true,
          producer: WALLET,
          buyer: BUYER,
          status: "funded",
        },
      })
    );
    expect(r.ok).toBe(false);
  });

  it("rejects a lot that is not indexed or not awaiting receipt", () => {
    expect(verifyLotRedemption(redeemBase({ indexedStatus: null })).ok).toBe(
      false
    );
    const r = verifyLotRedemption(redeemBase({ indexedStatus: "listed" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rejection.status).toBe(409);
  });
});
