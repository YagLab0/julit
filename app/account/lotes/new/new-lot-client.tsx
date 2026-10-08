"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { VerifiedWalletGate } from "../../../components/verified-wallet-gate";
import { useAccountDict } from "../../i18n/context";
import { RegisterLotForm, type Counterparty } from "./register-lot-form";
import type { ProducerSpecs } from "./validation";

export type ProducerInfo = {
  name: string;
  walletAddress: string;
  originId: string;
  originName: string;
  specs: ProducerSpecs;
};

export function NewLotClient({ producer }: { producer: ProducerInfo }) {
  const dict = useAccountDict();
  const [buyers, setBuyers] = useState<Counterparty[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/companies/contracts/counterparties?type=buyer")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { counterparties: Counterparty[] }) => {
        if (!cancelled) setBuyers(data.counterparties);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  let content: ReactNode;
  if (loadError) {
    content = (
      <div className="mt-8 rounded-3xl bg-card p-8 text-center">
        <p className="text-sm text-destructive">{dict.newLot.loadError}</p>
      </div>
    );
  } else if (!buyers) {
    content = (
      <div className="mt-8 rounded-3xl bg-card p-8 text-center">
        <p className="text-sm text-muted">{dict.newLot.loading}</p>
      </div>
    );
  } else if (buyers.length === 0) {
    content = (
      <div className="mt-8 rounded-3xl border border-amber-300 bg-amber-50/60 p-8 text-center dark:border-amber-800 dark:bg-amber-950/40">
        <p className="text-sm text-amber-900 dark:text-amber-200">
          {dict.newLot.noBuyers}
        </p>
        <Link
          href="/account/contratos"
          className="btn-secondary mt-4 inline-block rounded-full px-4"
        >
          {dict.newLot.manageContracts}
        </Link>
      </div>
    );
  } else {
    content = <RegisterLotForm producer={producer} buyers={buyers} />;
  }

  return (
    <VerifiedWalletGate
      name={producer.name}
      walletAddress={producer.walletAddress}
      action={dict.newLot.gate.action}
      signAs={dict.newLot.gate.signAs}
    >
      {content}
    </VerifiedWalletGate>
  );
}
