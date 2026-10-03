"use client";

import { useEffect, useState } from "react";
import { VerifiedWalletGate } from "../../components/verified-wallet-gate";
import { DEMO_AUDITORS, DEMO_BUYERS, type Counterparty } from "./counterparties";
import { RegisterBatchForm } from "./register-batch-form";

export type ProducerInfo = {
  name: string;
  walletAddress: string;
  originId: string;
  originName: string;
};

export function NewBatchClient({ producer }: { producer: ProducerInfo }) {
  const [buyers, setBuyers] = useState<Counterparty[]>(DEMO_BUYERS);
  const [auditors, setAuditors] = useState<Counterparty[]>(DEMO_AUDITORS);

  useEffect(() => {
    let active = true;
    fetch("/api/companies/contracts")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.contracts) return;
        const accepted = data.contracts.filter(
          (c: { status: string }) => c.status === "accepted"
        );

        const realBuyers: Counterparty[] = accepted
          .filter(
            (c: { counterparty?: { company_type?: string; wallet_address?: string; name?: string } }) =>
              c.counterparty?.company_type === "buyer" &&
              c.counterparty?.wallet_address
          )
          .map(
            (c: { counterparty: { name: string; wallet_address: string } }) => ({
              name: c.counterparty.name,
              wallet: c.counterparty.wallet_address,
            })
          );

        const realAuditors: Counterparty[] = accepted
          .filter(
            (c: { counterparty?: { company_type?: string; wallet_address?: string; name?: string } }) =>
              c.counterparty?.company_type === "auditor" &&
              c.counterparty?.wallet_address
          )
          .map(
            (c: { counterparty: { name: string; wallet_address: string } }) => ({
              name: c.counterparty.name,
              wallet: c.counterparty.wallet_address,
            })
          );

        if (realBuyers.length > 0) {
          setBuyers((prev) => {
            const map = new Map<string, Counterparty>();
            [...realBuyers, ...prev].forEach((b) => map.set(b.wallet, b));
            return Array.from(map.values());
          });
        }

        if (realAuditors.length > 0) {
          setAuditors((prev) => {
            const map = new Map<string, Counterparty>();
            [...realAuditors, ...prev].forEach((a) => map.set(a.wallet, a));
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  return (
    <VerifiedWalletGate
      name={producer.name}
      walletAddress={producer.walletAddress}
      action="registrar un lote"
      signAs="firmar como productora"
    >
      <RegisterBatchForm
        producer={producer}
        auditors={auditors}
        buyers={buyers}
      />
    </VerifiedWalletGate>
  );
}
