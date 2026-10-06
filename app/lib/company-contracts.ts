import type { CompanyType } from "./company";

/**
 * Contracts link one producer with one buyer — the only commercial pair the
 * lot lifecycle knows (ADR-0012). Either party may initiate; `initiator_id`
 * on the row records who offered, so the posture is derived per contract,
 * never from company types.
 */
export type ContractRole = "producer" | "counterparty";
export type ContractPosture = "initiator" | "responder";

/** Whether `initiatorType` may offer a contract to `responderType`, and how
 *  the company_contracts row is oriented: `producerIsInitiator` tells which
 *  side fills `producer_id`. Exactly one side must be a producer and the
 *  other a buyer. */
export function offerDirection(
  initiatorType: CompanyType,
  responderType: CompanyType
): { producerIsInitiator: boolean } | null {
  if (initiatorType === "producer" && responderType === "buyer") {
    return { producerIsInitiator: true };
  }
  if (initiatorType === "buyer" && responderType === "producer") {
    return { producerIsInitiator: false };
  }
  return null;
}

/** The session company's posture on a contract row, from its initiator. */
export function contractPosture(
  companyId: string,
  initiatorId: string
): ContractPosture {
  return companyId === initiatorId ? "initiator" : "responder";
}
