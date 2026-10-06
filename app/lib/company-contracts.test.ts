import { describe, expect, it } from "vitest";
import { contractPosture, offerDirection } from "./company-contracts";

describe("offerDirection", () => {
  it("allows a producer to offer to a buyer", () => {
    expect(offerDirection("producer", "buyer")).toEqual({
      producerIsInitiator: true,
    });
  });

  it("allows a buyer to offer to a producer", () => {
    expect(offerDirection("buyer", "producer")).toEqual({
      producerIsInitiator: false,
    });
  });

  it.each([
    ["producer", "producer"],
    ["buyer", "buyer"],
  ] as const)("rejects %s offering to %s", (initiator, responder) => {
    expect(offerDirection(initiator, responder)).toBeNull();
  });
});

describe("contractPosture", () => {
  it("labels the company that initiated as initiator", () => {
    expect(contractPosture("company-a", "company-a")).toBe("initiator");
    expect(contractPosture("company-a", "company-b")).toBe("responder");
  });
});
