"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { VerifiedWalletGate } from "../../components/verified-wallet-gate";
import { RegisterBatchForm, type Counterparty } from "./register-batch-form";

export type ProducerInfo = {
  name: string;
  walletAddress: string;
  originId: string;
  originName: string;
};

export function NewBatchClient({ producer }: { producer: ProducerInfo }) {
  const [counterparties, setCounterparties] = useState<{
    auditors: Counterparty[];
    buyers: Counterparty[];
  } | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/companies/contracts/counterparties?type=auditor").then((r) =>
        r.ok ? r.json() : Promise.reject(r.status)
      ),
      fetch("/api/companies/contracts/counterparties?type=buyer").then((r) =>
        r.ok ? r.json() : Promise.reject(r.status)
      ),
    ])
      .then(
        ([auditors, buyers]: [
          { counterparties: Counterparty[] },
          { counterparties: Counterparty[] },
        ]) => {
          if (!cancelled) {
            setCounterparties({
              auditors: auditors.counterparties,
              buyers: buyers.counterparties,
            });
          }
        }
      )
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
      <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-destructive">
          No se pudieron cargar tus contrapartes contratadas. Recargá la página.
        </p>
      </div>
    );
  } else if (!counterparties) {
    content = (
      <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted">
          Cargando auditores y clientes contratados…
        </p>
      </div>
    );
  } else if (counterparties.auditors.length === 0) {
    content = (
      <div className="mt-8 rounded-2xl border border-amber-300 bg-amber-50/60 p-8 text-center dark:border-amber-800 dark:bg-amber-950/40">
        <p className="text-sm text-amber-900 dark:text-amber-200">
          Necesitás un contrato aceptado con una auditora para registrar un
          lote. Ofrecelo desde tu cuenta y esperá a que lo acepten.
        </p>
        <Link href="/account" className="btn-secondary mt-4 inline-block">
          Gestionar contratos
        </Link>
      </div>
    );
  } else {
    content = (
      <RegisterBatchForm
        producer={producer}
        auditors={counterparties.auditors}
        buyers={counterparties.buyers}
      />
    );
  }

  return (
    <VerifiedWalletGate
      name={producer.name}
      walletAddress={producer.walletAddress}
      action="registrar un lote"
      signAs="firmar como productora"
    >
      {content}
    </VerifiedWalletGate>
  );
}
