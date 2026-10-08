import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  BuyerPortfolioCard,
  WalletCard,
  type AcquiredLot,
  type DesignatedLot,
} from "./account-client";
import { DesignatedLotsCard } from "./designated-lots";
import { WalletHero } from "./wallet-hero";
import { getAccountContext, type ProducerLot } from "./account-data";
import { getAccountDict } from "./i18n/server";
import type { AccountDict } from "./i18n";
import { AdminDashboard } from "./admin/admin-dashboard";

export default async function AccountPage() {
  const [
    {
      company,
      lots,
      designatedLots,
      producerLots,
      adminStats,
      adminLots,
      adminCompanies,
      adminOrigins,
    },
    dict,
  ] = await Promise.all([getAccountContext(), getAccountDict()]);

  // Layout renders the onboarding form when there is no company yet.
  if (!company) return null;

  if (company.companyType === "admin") {
    return (
      <AdminDashboard
        company={company}
        initialStats={adminStats ?? null}
        initialLots={adminLots ?? []}
        initialCompanies={adminCompanies ?? []}
        initialOrigins={adminOrigins ?? []}
      />
    );
  }

  const isBuyer = company.companyType === "buyer";

  const buyerLots: (DesignatedLot | AcquiredLot)[] = [
    ...designatedLots,
    ...lots,
  ];
  const stats = isBuyer
    ? buyerStats(buyerLots, dict)
    : producerStats(producerLots, dict);

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-6">
      {company.walletAddress ? (
        <WalletHero
          className="animate-bento-in sm:col-span-3"
          walletAddress={company.walletAddress}
          walletVerifiedAt={company.walletVerifiedAt}
        />
      ) : (
        <WalletCard
          className="animate-bento-in sm:col-span-3"
          walletAddress={company.walletAddress}
          walletVerifiedAt={company.walletVerifiedAt}
        />
      )}

      <div className="grid grid-cols-2 gap-4 sm:col-span-3">
        {stats.map((s, i) => (
          <StatTile
            key={s.label}
            index={i + 1}
            icon={s.icon}
            label={s.label}
            value={s.value}
            unit={s.unit}
            hint={s.hint}
          />
        ))}
      </div>

      {isBuyer ? (
        <>
          <DesignatedLotsCard
            className="animate-bento-in [--bento-i:5] sm:col-span-6"
            lots={designatedLots}
            companyName={company.name}
            walletAddress={company.walletAddress}
          />
          <BuyerPortfolioCard
            className="animate-bento-in [--bento-i:6] sm:col-span-6"
            lots={lots}
          />
        </>
      ) : (
        <>
          <NavCard
            href="/account/lotes"
            title={dict.summary.nav.lots.title}
            body={dict.summary.nav.lots.body}
            linkLabel={dict.summary.nav.lots.linkLabel}
            className="animate-bento-in [--bento-i:5] sm:col-span-2"
          />
          <NavCard
            href="/account/contratos"
            title={dict.summary.nav.contracts.title}
            body={dict.summary.nav.contracts.body}
            linkLabel={dict.summary.nav.contracts.linkLabel}
            className="animate-bento-in [--bento-i:6] sm:col-span-2"
          />
          <NavCard
            href="/account/ofertas"
            title={dict.summary.nav.offers.title}
            body={dict.summary.nav.offers.body}
            linkLabel={dict.summary.nav.offers.linkLabel}
            className="animate-bento-in [--bento-i:7] sm:col-span-2"
          />
        </>
      )}
    </div>
  );
}

type Stat = {
  icon: ReactNode;
  label: string;
  value: string;
  unit?: string;
  hint: string;
};

const ICONS = {
  lots: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-4"
    >
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  ),
  volume: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-4"
    >
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
    </svg>
  ),
  usdc: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-4"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 .9-3 2.3c0 3.4 6 1.7 6 5.2 0 1.4-1.3 2.5-3 2.5s-3-1.1-3-2.5" />
    </svg>
  ),
  escrow: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-4"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  ),
};

function buyerStats(
  lots: (DesignatedLot | AcquiredLot)[],
  dict: AccountDict
): Stat[] {
  const s = dict.summary.buyerStats;
  const volume = lots.reduce((acc, l) => acc + Number(l.volume_tonnes || 0), 0);
  const usdc = lots.reduce((acc, l) => acc + Number(l.price_usdc || 0), 0);
  const inEscrow = lots.filter(
    (l) => l.status === "funded" || l.status === "disputed"
  ).length;

  return [
    {
      icon: ICONS.lots,
      label: s.lotsLabel,
      value: String(lots.length),
      hint: s.lotsHint,
    },
    {
      icon: ICONS.volume,
      label: s.volumeLabel,
      value: volume.toLocaleString(dict.numLocale),
      unit: s.tonnesUnit,
      hint: s.volumeHint,
    },
    {
      icon: ICONS.usdc,
      label: s.investedLabel,
      value: usdc.toLocaleString(dict.numLocale),
      unit: s.usdcUnit,
      hint: s.investedHint,
    },
    {
      icon: ICONS.escrow,
      label: s.escrowLabel,
      value: String(inEscrow),
      hint: s.escrowHint,
    },
  ];
}

function producerStats(lots: ProducerLot[], dict: AccountDict): Stat[] {
  const s = dict.summary.producerStats;
  const volume = lots.reduce((acc, l) => acc + Number(l.volume_tonnes || 0), 0);
  const usdc = lots.reduce((acc, l) => acc + Number(l.price_usdc || 0), 0);
  const settled = lots.filter(
    (l) => l.status === "redeemed" || l.status === "claimed"
  ).length;

  return [
    {
      icon: ICONS.lots,
      label: s.lotsLabel,
      value: String(lots.length),
      hint: s.lotsHint,
    },
    {
      icon: ICONS.volume,
      label: s.volumeLabel,
      value: volume.toLocaleString(dict.numLocale),
      unit: s.tonnesUnit,
      hint: s.volumeHint,
    },
    {
      icon: ICONS.usdc,
      label: s.valueLabel,
      value: usdc.toLocaleString(dict.numLocale),
      unit: s.usdcUnit,
      hint: s.valueHint,
    },
    {
      icon: ICONS.escrow,
      label: s.redeemedLabel,
      value: String(settled),
      hint: s.redeemedHint,
    },
  ];
}

function StatTile({
  icon,
  label,
  value,
  unit,
  hint,
  index,
}: Stat & { index: number }) {
  return (
    <div
      style={{ "--bento-i": index } as CSSProperties}
      className="animate-bento-in flex flex-col rounded-3xl bg-card p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">{label}</p>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
          {icon}
        </span>
      </div>
      <p className="mt-4 font-mono text-3xl font-bold tabular-nums tracking-tight">
        {value}
        {unit && (
          <span className="ml-1 text-sm font-normal text-muted">{unit}</span>
        )}
      </p>
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </div>
  );
}

function NavCard({
  href,
  title,
  body,
  linkLabel,
  className = "sm:col-span-2",
}: {
  href: string;
  title: string;
  body: string;
  linkLabel: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col rounded-3xl bg-card p-6 ${className}`}
    >
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
      <span className="mt-auto pt-4 text-xs font-semibold text-brand-700">
        {linkLabel} →
      </span>
    </Link>
  );
}
