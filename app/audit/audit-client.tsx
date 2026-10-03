"use client";

import { useState } from "react";
import { VerifiedWalletGate } from "../components/verified-wallet-gate";
import { BatchCards } from "./assigned-batches";
import type { AuditBatch } from "./batches";
import { ContractsInbox } from "./contracts-inbox";
import type { ContractOffer } from "./contracts";

export type AuditorInfo = {
  name: string;
  walletAddress: string;
};

type TabKey = "pending" | "certified" | "contracts";

const TABS: { key: TabKey; label: string }[] = [
  { key: "pending", label: "Pendientes" },
  { key: "certified", label: "Certificados" },
  { key: "contracts", label: "Contratos" },
];

export function AuditClient({
  auditor,
  contracts,
  batches,
}: {
  auditor: AuditorInfo;
  contracts: ContractOffer[];
  batches: AuditBatch[];
}) {
  const [tab, setTab] = useState<TabKey>("pending");

  const pending = batches.filter((b) => b.status === "created");
  const certified = batches.filter((b) => b.status !== "created");
  const counts: Record<TabKey, number> = {
    pending: pending.length,
    certified: certified.length,
    contracts: contracts.filter((c) => c.status === "pending").length,
  };

  return (
    <VerifiedWalletGate
      name={auditor.name}
      walletAddress={auditor.walletAddress}
      action="certificar lotes"
      signAs="firmar como auditora"
    >
      <div className="mt-6">
        <div
          role="tablist"
          className="flex gap-1 rounded-xl border border-border bg-card p-1"
        >
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === key
                  ? "bg-secondary text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {label}
              {counts[key] > 0 && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    tab === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted"
                  }`}
                >
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab !== "contracts" ? (
            <section className="rounded-2xl border border-border bg-card p-6">
              <p className="eyebrow">
                {tab === "pending"
                  ? "Pendientes de certificar"
                  : "Certificados"}
              </p>
              <div className="mt-3">
                <BatchCards
                  batches={tab === "pending" ? pending : certified}
                  emptyMessage={
                    tab === "pending"
                      ? "No tenés lotes esperando certificación."
                      : "Todavía no certificaste ningún lote."
                  }
                />
              </div>
            </section>
          ) : (
            <ContractsInbox offers={contracts} />
          )}
        </div>
      </div>
    </VerifiedWalletGate>
  );
}
