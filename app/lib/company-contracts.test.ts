import { describe, expect, it } from "vitest";
import {
  contractDirection,
  contractPosture,
  offerDirection,
} from "./company-contracts";

describe("contractDirection", () => {
  it("makes the producer initiate and the auditor respond for auditor contracts", () => {
    expect(contractDirection("auditor")).toEqual({
      initiator: "producer",
      responder: "counterparty",
    });
  });

  it("makes the buyer initiate and the producer respond for buyer contracts", () => {
    expect(contractDirection("buyer")).toEqual({
      initiator: "counterparty",
      responder: "producer",
    });
  });

  it("rejects a producer counterparty", () => {
    expect(contractDirection("producer")).toBeNull();
  });
});

describe("contractPosture", () => {
  it("labels the producer initiator and the auditor responder on auditor contracts", () => {
    expect(contractPosture("producer", "auditor")).toBe("initiator");
    expect(contractPosture("counterparty", "auditor")).toBe("responder");
  });

  it("labels the buyer initiator and the producer responder on buyer contracts", () => {
    expect(contractPosture("counterparty", "buyer")).toBe("initiator");
    expect(contractPosture("producer", "buyer")).toBe("responder");
  });
});

describe("offerDirection", () => {
  it("allows a producer to offer to an auditor", () => {
    expect(offerDirection("producer", "auditor")).toEqual({
      counterpartyType: "auditor",
      producerIsInitiator: true,
    });
  });

  it("allows a buyer to offer to a producer", () => {
    expect(offerDirection("buyer", "producer")).toEqual({
      counterpartyType: "buyer",
      producerIsInitiator: false,
    });
  });

  it.each([
    ["producer", "buyer"],
    ["producer", "producer"],
    ["buyer", "auditor"],
    ["buyer", "buyer"],
    ["auditor", "producer"],
    ["auditor", "auditor"],
    ["auditor", "buyer"],
  ] as const)("rejects %s offering to %s", (initiator, responder) => {
    expect(offerDirection(initiator, responder)).toBeNull();
  });
});
