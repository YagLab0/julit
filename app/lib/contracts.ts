export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CONTRACT_SIGNATURE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

export type ContractAgreementParams = {
  producerWallet: string;
  counterpartyWallet: string;
  initiatorWallet: string;
  timestamp: string;
};

/**
 * Builds the canonical commercial contract agreement string that must be
 * signed by wallet holders (ADR-0009).
 */
export function buildContractAgreementMessage({
  producerWallet,
  counterpartyWallet,
  initiatorWallet,
  timestamp,
}: ContractAgreementParams): string {
  return [
    "JuLit Commercial Agreement",
    `Producer: ${producerWallet}`,
    `Counterparty: ${counterpartyWallet}`,
    `Initiator: ${initiatorWallet}`,
    `Timestamp: ${timestamp}`,
  ].join("\n");
}
