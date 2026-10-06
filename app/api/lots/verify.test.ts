import { describe, expect, it } from "vitest";
import { verifyLotCreation, type VerifyLotCreationInput } from "./verify";

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
