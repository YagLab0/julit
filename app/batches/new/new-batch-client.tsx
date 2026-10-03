"use client";

import { VerifiedWalletGate } from "../../components/verified-wallet-gate";
import { DEMO_AUDITORS, DEMO_BUYERS } from "./counterparties";
import { RegisterBatchForm } from "./register-batch-form";

export type ProducerInfo = {
  name: string;
  walletAddress: string;
  originId: string;
  originName: string;
};

export function NewBatchClient({ producer }: { producer: ProducerInfo }) {
  return (
    <VerifiedWalletGate
      name={producer.name}
      walletAddress={producer.walletAddress}
      action="registrar un lote"
      signAs="firmar como productora"
    >
      <RegisterBatchForm
        producer={producer}
        auditors={DEMO_AUDITORS}
        buyers={DEMO_BUYERS}
      />
    </VerifiedWalletGate>
  );
}
