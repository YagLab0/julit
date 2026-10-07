import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  BuyerPortfolioCard,
  WalletCard,
  type AcquiredLot,
} from "./account-client";
import { WalletHero } from "./wallet-hero";
import { getAccountContext, type ProducerLot } from "./account-data";

export default async function AccountPage() {
  const { company, lots, producerLots } = await getAccountContext();

  // Layout renders the onboarding form when there is no company yet.
  if (!company) return null;

  const isBuyer = company.companyType === "buyer";

  const stats = isBuyer ? buyerStats(lots) : producerStats(producerLots);

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
        <BuyerPortfolioCard
          className="animate-bento-in sm:col-span-6"
          lots={lots}
        />
      ) : (
        <>
          <NavCard
            href="/account/lotes"
            title="Mis lotes"
            body="Todos los lotes que registraste, con su estado on-chain y comprador designado."
            linkLabel="Ver lotes"
            className="animate-bento-in [--bento-i:5] sm:col-span-2"
          />
          <NavCard
            href="/account/contratos"
            title="Contratos comerciales"
            body="Ofrecé un contrato a una compradora para habilitarla como cliente de tus lotes."
            linkLabel="Ver contratos"
            className="animate-bento-in [--bento-i:6] sm:col-span-2"
          />
          <NavCard
            href="/account/ofertas"
            title="Ofertas de compras"
            body="Las compradoras te ofrecen contratos para reservar tus lotes."
            linkLabel="Ver ofertas"
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

function buyerStats(lots: AcquiredLot[]): Stat[] {
  const volume = lots.reduce((s, l) => s + Number(l.volume_tonnes || 0), 0);
  const usdc = lots.reduce((s, l) => s + Number(l.price_usdc || 0), 0);
  const inEscrow = lots.filter(
    (l) => l.status === "funded" || l.status === "disputed"
  ).length;

  return [
    {
      icon: ICONS.lots,
      label: "Lotes adquiridos",
      value: String(lots.length),
      hint: "con escrow en Devnet",
    },
    {
      icon: ICONS.volume,
      label: "Volumen total",
      value: volume.toLocaleString("es-AR"),
      unit: "t",
      hint: "de Li₂CO₃",
    },
    {
      icon: ICONS.usdc,
      label: "Inversión",
      value: usdc.toLocaleString("es-AR"),
      unit: "USDC",
      hint: "depositado en escrow",
    },
    {
      icon: ICONS.escrow,
      label: "En escrow",
      value: String(inEscrow),
      hint: "a la espera de entrega",
    },
  ];
}

function producerStats(lots: ProducerLot[]): Stat[] {
  const volume = lots.reduce((s, l) => s + Number(l.volume_tonnes || 0), 0);
  const usdc = lots.reduce((s, l) => s + Number(l.price_usdc || 0), 0);
  const settled = lots.filter(
    (l) => l.status === "redeemed" || l.status === "claimed"
  ).length;

  return [
    {
      icon: ICONS.lots,
      label: "Lotes registrados",
      value: String(lots.length),
      hint: "en el índice on-chain",
    },
    {
      icon: ICONS.volume,
      label: "Volumen declarado",
      value: volume.toLocaleString("es-AR"),
      unit: "t",
      hint: "de Li₂CO₃",
    },
    {
      icon: ICONS.usdc,
      label: "Valor total",
      value: usdc.toLocaleString("es-AR"),
      unit: "USDC",
      hint: "cotización de lotes",
    },
    {
      icon: ICONS.escrow,
      label: "Liquidados",
      value: String(settled),
      hint: "liquidación confirmada",
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
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-400">
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
      <span className="mt-auto pt-4 text-xs font-semibold text-brand-700 dark:text-brand-400">
        {linkLabel} →
      </span>
    </Link>
  );
}
