import type { CompanyType } from "./company";

/**
 * Contract direction per ADR-0008: initiation is fixed per party pair and
 * derived from company types — never stored or submitted.
 *
 * - producer ↔ auditor: the producer initiates, the auditor responds.
 * - producer ↔ buyer: the buyer initiates, the producer responds.
 * - Any other pair cannot hold a contract.
 */

export type ContractRole = "producer" | "counterparty";
export type ContractPosture = "initiator" | "responder";

export function contractDirection(
  counterpartyType: CompanyType,
): { initiator: ContractRole; responder: ContractRole } | null {
  switch (counterpartyType) {
    case "auditor":
      return { initiator: "producer", responder: "counterparty" };
    case "buyer":
      return { initiator: "counterparty", responder: "producer" };
    default:
      return null;
  }
}

export function contractPosture(
  role: ContractRole,
  counterpartyType: CompanyType,
): ContractPosture | null {
  const direction = contractDirection(counterpartyType);
  if (!direction) return null;
  return direction.initiator === role ? "initiator" : "responder";
}

/**
 * Whether `initiatorType` may offer a contract to `responderType`, and how
 * the company_contracts row is oriented: `producerIsInitiator` tells which
 * side fills `producer_id`. Exactly one side must be a producer.
 */
export function offerDirection(
  initiatorType: CompanyType,
  responderType: CompanyType,
): { counterpartyType: "auditor" | "buyer"; producerIsInitiator: boolean } | null {
  if (initiatorType === "producer") {
    return responderType === "auditor"
      ? { counterpartyType: "auditor", producerIsInitiator: true }
      : null;
  }
  if (responderType === "producer") {
    return initiatorType === "buyer"
      ? { counterpartyType: "buyer", producerIsInitiator: false }
      : null;
  }
  return null;
}
