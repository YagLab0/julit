"use client";

import { VerifiedWalletGate } from "../components/verified-wallet-gate";
import { AssignedBatches } from "./assigned-batches";
import type { AuditBatch } from "./batches";
import { ContractsInbox } from "./contracts-inbox";
import type { ContractOffer } from "./contracts";

export type AuditorInfo = {
  name: string;
  walletAddress: string;
};

export function AuditClient({
  auditor,
  contracts,
  batches,
}: {
  auditor: AuditorInfo;
  contracts: ContractOffer[];
  batches: AuditBatch[];
}) {
  return (
    <VerifiedWalletGate
      name={auditor.name}
      walletAddress={auditor.walletAddress}
      action="certificar lotes"
      signAs="firmar como auditora"
    >
      <div className="mt-6 space-y-6">
        <AssignedBatches batches={batches} />
        <ContractsInbox offers={contracts} />
      </div>
    </VerifiedWalletGate>
  );
}
