"use client";

import { VerifiedWalletGate } from "../components/verified-wallet-gate";
import { AssignedBatches } from "./assigned-batches";
import { ContractsInbox } from "./contracts-inbox";
import type { ContractOffer } from "./contracts";

export type AuditorInfo = {
  name: string;
  walletAddress: string;
};

export function AuditClient({
  auditor,
  contracts,
}: {
  auditor: AuditorInfo;
  contracts: ContractOffer[];
}) {
  return (
    <VerifiedWalletGate
      name={auditor.name}
      walletAddress={auditor.walletAddress}
      action="certificar lotes"
      signAs="firmar como auditora"
    >
      <div className="mt-6 space-y-6">
        <p
          role="note"
          className="rounded-lg border border-amber-300 bg-amber-50/95 px-3 py-2 text-[11px] leading-snug text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
        >
          <strong>Datos simulados – demo visual.</strong> Los lotes no
          corresponden a operaciones reales: el índice on-chain todavía no
          existe. Las ofertas de contrato sí son reales.
        </p>

        <AssignedBatches />
        <ContractsInbox offers={contracts} />
      </div>
    </VerifiedWalletGate>
  );
}
