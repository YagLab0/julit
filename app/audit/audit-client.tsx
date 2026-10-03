"use client";

import { VerifiedWalletGate } from "../components/verified-wallet-gate";
import { AssignedBatches } from "./assigned-batches";
import { ContractsInbox } from "./contracts-inbox";

export type AuditorInfo = {
  name: string;
  walletAddress: string;
};

export function AuditClient({ auditor }: { auditor: AuditorInfo }) {
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
          <strong>Datos simulados – demo visual.</strong> Los lotes y contratos
          no corresponden a operaciones reales: el índice on-chain y la API de
          contratos todavía no existen.
        </p>

        <AssignedBatches />
        <ContractsInbox />
      </div>
    </VerifiedWalletGate>
  );
}
