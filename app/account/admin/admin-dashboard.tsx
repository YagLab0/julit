"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, type CSSProperties, type ReactNode } from "react";
import { toast } from "sonner";
import type { AccountCompany } from "../account-client";
import type { AdminCompany, AdminLot, ProtocolStats } from "../account-data";
import type { CompanyType } from "../../lib/company";
import { ellipsify, getExplorerUrl } from "../../lib/explorer";
import { originName, ORIGINS } from "../../lib/origins";
import { useOptionalCluster } from "../../components/cluster-context";
import { StatusBadge } from "../../explorer/components/lot-display";
import type { LotStatus } from "../../explorer/data/lots";
import type { Origin } from "../../explorer/data/origins";
import { calculateLotSettlement } from "../lot-actions";
import { useAccountDict } from "../i18n/context";
import { t } from "../i18n";

export type AdminDashboardProps = {
  company: AccountCompany;
  initialStats: ProtocolStats | null;
  initialLots: AdminLot[];
  initialCompanies?: AdminCompany[];
  initialOrigins?: Origin[];
};

type TreasuryApiResponse = {
  admin: {
    id: string;
    name: string;
    wallet_address: string | null;
    wallet_verified_at: string | null;
    is_wallet_verified: boolean;
    matches_onchain_admin: boolean;
    matches_onchain_treasury: boolean;
  };
  config: {
    pda: string;
    admin: string;
    treasury: string;
    fee_bps: number;
    fee_percentage: number;
    usdc_mint: string;
  };
  balances: {
    treasury: string;
    usdc_ata: string;
    sol: {
      lamports: string;
      sol: number;
    };
    usdc: {
      raw_amount: string;
      ui_amount: number;
      decimals: number;
      ui_amount_string: string;
    };
  };
  ledger: {
    settled_lots_count: number;
    total_settled_volume_tonnes: number;
    total_settled_value_usdc: number;
    total_fees_collected_usdc: number;
  };
};

const DEFAULT_ORIGINS: Origin[] = [
  {
    id: "pena_blanca",
    name: "Salar de Peña Blanca",
    code: "PBL",
    salar: "Salar de Peña Blanca",
    producer: "Sales del Altiplano S.A.",
    shareholders: "Altiplano Holding 60 % · Fondo Puna 25 % · Minera Jujeña 15 %",
    longitude: -66.70248,
    latitude: -23.46293,
    capacity_tpa: 42500,
    altitude_m: 3900,
    water_m3_per_tonne: 51.0,
    note: "Huella hídrica de referencia: 51,0 m³/t Li₂CO₃. Datos de demostración: empresa y proyecto son ficticios.",
    source_label: "Informe técnico Peña Blanca 2025",
    source_url: "https://example.com/informes/pena-blanca-2025",
  },
  {
    id: "condor",
    name: "Salar del Cóndor",
    code: "CNR",
    salar: "Salar del Cóndor",
    producer: "Minera Cóndor S.A.",
    shareholders: "Cóndor Holding 70 % · Fondo Puna 30 %",
    longitude: -66.77329,
    latitude: -23.67394,
    capacity_tpa: 40000,
    altitude_m: null,
    water_m3_per_tonne: null,
    note: "Producción de referencia 2025: ~34.100 t de carbonato de litio; sin huella hídrica publicada. Datos de demostración: empresa y proyecto son ficticios.",
    source_label: "Informe técnico Cóndor 2026",
    source_url: "https://example.com/informes/condor-2026",
  },
];

export function AdminDashboard({
  company,
  initialStats,
  initialLots,
  initialCompanies = [],
  initialOrigins = [],
}: AdminDashboardProps) {
  const dict = useAccountDict();
  const tAdmin = dict.adminDashboard;

  const numFmt = useMemo(
    () =>
      new Intl.NumberFormat(dict.numLocale, {
        maximumFractionDigits: 2,
      }),
    [dict.numLocale]
  );

  const priceFmt = useMemo(
    () =>
      new Intl.NumberFormat(dict.numLocale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [dict.numLocale]
  );

  const cluster = useOptionalCluster();
  const [lots] = useState<AdminLot[]>(initialLots);
  const [stats] = useState<ProtocolStats | null>(initialStats);
  const [companies, setCompanies] = useState<AdminCompany[]>(initialCompanies);
  const [origins, setOrigins] = useState<Origin[]>(() =>
    initialOrigins && initialOrigins.length > 0 ? initialOrigins : DEFAULT_ORIGINS
  );
  const [isRegisterCompanyOpen, setIsRegisterCompanyOpen] = useState(false);
  const [isRegisterOriginOpen, setIsRegisterOriginOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "disputed" | "funded" | "listed" | "redeemed" | "all"
  >(() => {
    // Default to disputed if there are any active disputes to attend to
    const hasDisputes = initialLots.some((l) => l.status === "disputed");
    return hasDisputes ? "disputed" : "all";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "volume" | "price">("newest");
  const [selectedLot, setSelectedLot] = useState<AdminLot | null>(null);

  const resolveOriginName = (id: string | null | undefined) => {
    if (!id) return "";
    return origins.find((o) => o.id === id)?.name || originName(id) || id;
  };

  // Live on-chain treasury state
  const [treasuryData, setTreasuryData] = useState<TreasuryApiResponse | null>(
    null
  );
  const [isRefreshingTreasury, setIsRefreshingTreasury] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchTreasury() {
      try {
        const res = await fetch("/api/admin/treasury");
        if (!res.ok) return;
        const data = (await res.json()) as TreasuryApiResponse;
        if (!cancelled) {
          setTreasuryData(data);
        }
      } catch {
        // Fallback to static props gracefully
      }
    }
    void fetchTreasury();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRefreshTreasury() {
    setIsRefreshingTreasury(true);
    try {
      const res = await fetch("/api/admin/treasury");
      if (!res.ok) {
        throw new Error("Failed to fetch on-chain treasury");
      }
      const data = (await res.json()) as TreasuryApiResponse;
      setTreasuryData(data);
      toast.success(tAdmin.treasury.syncSuccess);
    } catch {
      toast.error(tAdmin.treasury.syncError);
    } finally {
      setIsRefreshingTreasury(false);
    }
  }

  // Financial KPIs
  const feesUsdc =
    treasuryData?.ledger?.total_fees_collected_usdc ??
    stats?.lots?.estimatedProtocolFeesUsdc ??
    0;

  const totalVolumeLce =
    stats?.lots?.totalVolumeTonnes ??
    lots.reduce((acc, l) => acc + Number(l.volume_tonnes || 0), 0);

  const settledVolumeLce =
    stats?.lots?.settledVolumeTonnes ??
    lots
      .filter((l) => l.status === "redeemed" || l.status === "claimed")
      .reduce((acc, l) => acc + Number(l.volume_tonnes || 0), 0);

  const inEscrowLots = lots.filter(
    (l) => l.status === "funded" || l.status === "disputed"
  );
  const escrowCount = stats?.lots?.byStatus
    ? (stats.lots.byStatus.funded || 0) + (stats.lots.byStatus.disputed || 0)
    : inEscrowLots.length;

  const escrowedValueUsdc =
    stats?.lots?.escrowedValueUsdc ??
    inEscrowLots.reduce((acc, l) => acc + Number(l.price_usdc || 0), 0);

  const disputedLots = lots.filter((l) => l.status === "disputed");
  const disputedCount =
    stats?.lots?.byStatus?.disputed ?? disputedLots.length;

  // Alerts summary: disputed lots + whether admin wallet is unverified
  const alertsCount = disputedCount + (company.walletVerifiedAt ? 0 : 1);

  // ESG averages calculated across protocol lots with environmental figures
  const lotsWithWater = lots.filter(
    (l) => l.water_footprint_m3_per_tonne !== null && l.water_footprint_m3_per_tonne > 0
  );
  const avgWaterM3PerTonne =
    lotsWithWater.length > 0
      ? lotsWithWater.reduce(
          (acc, l) => acc + Number(l.water_footprint_m3_per_tonne),
          0
        ) / lotsWithWater.length
      : 57.5; // Standard JuLit baseline

  const lotsWithCarbon = lots.filter(
    (l) =>
      l.carbon_footprint_kg_co2e_per_tonne !== null &&
      l.carbon_footprint_kg_co2e_per_tonne > 0
  );
  const avgCarbonKgPerTonne =
    lotsWithCarbon.length > 0
      ? lotsWithCarbon.reduce(
          (acc, l) => acc + Number(l.carbon_footprint_kg_co2e_per_tonne),
          0
        ) / lotsWithCarbon.length
      : 8650;

  const lotsWithPurity = lots.filter((l) => l.purity_pct && l.purity_pct > 0);
  const avgPurityPct =
    lotsWithPurity.length > 0
      ? lotsWithPurity.reduce((acc, l) => acc + Number(l.purity_pct), 0) /
        lotsWithPurity.length
      : 99.58;

  // Task Center filtered lots
  const filteredLots = useMemo(() => {
    let result = [...lots];

    // Status tab filter
    if (activeTab !== "all") {
      result = result.filter((l) => l.status === activeTab);
    }

    // Origin selector filter
    if (originFilter !== "all") {
      result = result.filter((l) => l.origin_id === originFilter);
    }

    // Reactive search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((l) => {
        const idMatch = l.lot_id.toLowerCase().includes(q);
        const originMatch = (originName(l.origin_id) || "").toLowerCase().includes(q);
        const producerMatch =
          (l.producer_name || "").toLowerCase().includes(q) ||
          l.producer_wallet.toLowerCase().includes(q);
        const buyerMatch =
          (l.buyer_name || "").toLowerCase().includes(q) ||
          l.buyer_wallet.toLowerCase().includes(q);
        return idMatch || originMatch || producerMatch || buyerMatch;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "volume") {
        return Number(b.volume_tonnes || 0) - Number(a.volume_tonnes || 0);
      }
      if (sortBy === "price") {
        return Number(b.price_usdc || 0) - Number(a.price_usdc || 0);
      }
      return (
        new Date(b.indexed_at).getTime() - new Date(a.indexed_at).getTime()
      );
    });

    return result;
  }, [lots, activeTab, originFilter, searchQuery, sortBy]);

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(t(tAdmin.treasury.copiedToast, { label }));
  };

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* 1. HERO DE KPIS FINANCIEROS */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Comisiones USDC */}
        <BentoKpiCard
          index={1}
          icon={ICON_USDC}
          label={tAdmin.kpis.feesLabel}
          value={`$${priceFmt.format(feesUsdc)}`}
          unit="USDC"
          badge={tAdmin.kpis.feesBadge}
          hint={tAdmin.kpis.feesHint}
        />

        {/* KPI 2: Volumen LCE */}
        <BentoKpiCard
          index={2}
          icon={ICON_VOLUME}
          label={tAdmin.kpis.volumeLabel}
          value={numFmt.format(totalVolumeLce)}
          unit={tAdmin.kpis.volumeUnit}
          badge={t(tAdmin.kpis.volumeBadge, { settled: numFmt.format(settledVolumeLce) })}
          hint={tAdmin.kpis.volumeHint}
        />

        {/* KPI 3: Lotes en Escrow */}
        <BentoKpiCard
          index={3}
          icon={ICON_ESCROW}
          label={tAdmin.kpis.escrowLabel}
          value={String(escrowCount)}
          unit={tAdmin.kpis.escrowUnit}
          badge={`$${priceFmt.format(escrowedValueUsdc)} USDC`}
          hint={tAdmin.kpis.escrowHint}
        />

        {/* KPI 4: Alertas Operativas */}
        <BentoKpiCard
          index={4}
          icon={ICON_ALERT}
          label={tAdmin.kpis.alertsLabel}
          value={String(alertsCount)}
          unit={alertsCount === 1 ? tAdmin.kpis.alertsUnitOne : tAdmin.kpis.alertsUnitOther}
          badge={
            disputedCount > 0 ? tAdmin.kpis.alertsDisputes : tAdmin.kpis.alertsNormal
          }
          badgeVariant={disputedCount > 0 ? "warning" : "success"}
          hint={
            disputedCount > 0
              ? tAdmin.kpis.alertsDisputesHint
              : tAdmin.kpis.alertsNormalHint
          }
          onClick={() => {
            if (disputedCount > 0) {
              setActiveTab("disputed");
              const el = document.getElementById("task-center");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }
          }}
        />
      </section>

      {/* 2. FILA BENTO: TARJETA DE TESORERÍA & MONITOREO ESG */}
      <section className="grid gap-4 lg:grid-cols-12">
        {/* Tarjeta de Tesorería */}
        <div
          id="treasury-card"
          style={{ "--bento-i": 5 } as CSSProperties}
          className="animate-bento-in flex flex-col rounded-3xl bg-card border border-border p-6 shadow-xs lg:col-span-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">{tAdmin.treasury.eyebrow}</p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-foreground">
                {tAdmin.treasury.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => void handleRefreshTreasury()}
              disabled={isRefreshingTreasury}
              aria-label={tAdmin.treasury.syncBtn}
              className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-muted hover:text-foreground transition active:scale-[0.97] disabled:opacity-50"
            >
              <span
                className={`inline-block ${
                  isRefreshingTreasury ? "animate-spin" : ""
                }`}
              >
                ↻
              </span>
            </button>
          </div>

          <p className="mt-2 text-xs text-muted leading-relaxed">
            {tAdmin.treasury.desc}
          </p>

          {/* Treasury Address & Explorer Link */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-secondary p-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {tAdmin.treasury.addressLabel}
              </p>
              <p className="mt-0.5 font-mono text-xs font-medium text-foreground truncate">
                {treasuryData?.config.treasury
                  ? ellipsify(treasuryData.config.treasury, 8)
                  : company.walletAddress
                    ? ellipsify(company.walletAddress, 8)
                    : "Configuración singleton on-chain"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {treasuryData?.config.treasury && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        treasuryData.config.treasury,
                        tAdmin.treasury.addressLabel
                      )
                    }
                    className="cursor-pointer rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted transition hover:text-foreground active:scale-[0.97]"
                  >
                    {tAdmin.treasury.copyBtn}
                  </button>
                  <a
                    href={getExplorerUrl(
                      `/address/${treasuryData.config.treasury}`,
                      cluster
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="grid size-7 place-items-center rounded-full bg-card border border-border text-xs text-muted transition hover:text-foreground active:scale-[0.97]"
                  >
                    ↗
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Treasury Metrics Grid */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border-low bg-card p-3.5">
              <p className="text-[11px] text-muted">{tAdmin.treasury.solLabel}</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">
                {treasuryData
                  ? numFmt.format(treasuryData.balances.sol.sol)
                  : "—"}
                <span className="ml-1 text-xs font-normal text-muted">{tAdmin.treasury.solUnit}</span>
              </p>
              <p className="mt-0.5 text-[10px] text-muted">
                {treasuryData
                  ? `${treasuryData.balances.sol.lamports} lamports`
                  : tAdmin.treasury.solQuerying}
              </p>
            </div>

            <div className="rounded-2xl border border-border-low bg-card p-3.5">
              <p className="text-[11px] text-muted">{tAdmin.treasury.usdcLabel}</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">
                $
                {treasuryData
                  ? priceFmt.format(treasuryData.balances.usdc.ui_amount)
                  : priceFmt.format(feesUsdc)}
                <span className="ml-1 text-xs font-normal text-muted">{tAdmin.treasury.usdcUnit}</span>
              </p>
              <p className="mt-0.5 text-[10px] text-muted">
                {tAdmin.treasury.usdcHint}
              </p>
            </div>

            <div className="rounded-2xl border border-border-low bg-card p-3.5">
              <p className="text-[11px] text-muted">{tAdmin.treasury.feeRateLabel}</p>
              <p className="mt-1 font-mono text-lg font-bold text-foreground">
                100 bps{" "}
                <span className="text-xs font-normal text-muted">(1,00%)</span>
              </p>
              <p className="mt-0.5 text-[10px] text-muted">
                {tAdmin.treasury.feeRateHint}
              </p>
            </div>

            <div className="rounded-2xl border border-border-low bg-card p-3.5">
              <p className="text-[11px] text-muted">{tAdmin.treasury.adminAuthorityLabel}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`size-2 rounded-full ${
                    treasuryData?.admin.matches_onchain_admin
                      ? "bg-brand-600"
                      : "bg-amber-500"
                  }`}
                />
                <p className="text-xs font-semibold text-foreground">
                  {treasuryData?.admin.matches_onchain_admin
                    ? tAdmin.treasury.onchainAuthorized
                    : tAdmin.treasury.adminRegistered}
                </p>
              </div>
              <p className="mt-0.5 text-[10px] text-muted truncate">
                {company.name}
              </p>
            </div>
          </div>
        </div>

        {/* Monitoreo ESG */}
        <div
          style={{ "--bento-i": 6 } as CSSProperties}
          className="animate-bento-in flex flex-col rounded-3xl bg-card border border-border p-6 shadow-xs lg:col-span-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">{tAdmin.esg.eyebrow}</p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-foreground">
                {tAdmin.esg.title}
              </h2>
            </div>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
              {ICON_LEAF}
            </span>
          </div>

          <p className="mt-2 text-xs text-muted leading-relaxed">
            {tAdmin.esg.desc}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {/* Huella Hídrica */}
            <div className="rounded-2xl border border-border-low bg-card p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted">{tAdmin.esg.waterLabel}</p>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                  {tAdmin.esg.waterBadge}
                </span>
              </div>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">
                {numFmt.format(avgWaterM3PerTonne)}
                <span className="ml-1 text-xs font-normal text-muted">
                  {tAdmin.esg.waterUnit}
                </span>
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(10, (avgWaterM3PerTonne / 100) * 100)
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-muted">
                {tAdmin.esg.waterBenchmark}
              </p>
            </div>

            {/* Huella de Carbono */}
            <div className="rounded-2xl border border-border-low bg-card p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted">{tAdmin.esg.carbonLabel}</p>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted">
                  {tAdmin.esg.carbonBadge}
                </span>
              </div>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">
                {numFmt.format(avgCarbonKgPerTonne)}
                <span className="ml-1 text-xs font-normal text-muted">
                  {tAdmin.esg.carbonUnit}
                </span>
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(10, (avgCarbonKgPerTonne / 12000) * 100)
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-muted">
                {tAdmin.esg.carbonBenchmark}
              </p>
            </div>

            {/* Pureza Química */}
            <div className="rounded-2xl border border-border-low bg-card p-3.5">
              <p className="text-[11px] text-muted">{tAdmin.esg.purityLabel}</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">
                {numFmt.format(avgPurityPct)}%
              </p>
              <p className="mt-1 text-[10px] font-medium text-brand-700">
                {tAdmin.esg.purityBadge}
              </p>
            </div>

            {/* Salares Monitoreados */}
            <div className="rounded-2xl border border-border-low bg-card p-3.5">
              <p className="text-[11px] text-muted">{tAdmin.esg.originsLabel}</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">
                {origins.length}
                <span className="ml-1 text-xs font-normal text-muted">
                  {tAdmin.esg.originsUnit}
                </span>
              </p>
              <p className="mt-1 text-[10px] text-muted truncate">
                {origins.map((o) => o.name.replace("Salar de ", "").replace("Salar del ", "")).slice(0, 3).join(" · ")}
              </p>
            </div>
          </div>

          <div className="mt-auto pt-4 flex items-center justify-between text-xs text-muted border-t border-border-low">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-brand-600" />
              {tAdmin.esg.certifiedFooter}
            </span>
            <Link
              href="/account/catalogo"
              className="font-semibold text-brand-700 hover:underline"
            >
              {tAdmin.esg.exploreMapLink}
            </Link>
          </div>
        </div>
      </section>

      {/* 3. CENTRO DE GESTIÓN DE TAREAS Y LOTES */}
      <section
        id="task-center"
        style={{ "--bento-i": 7 } as CSSProperties}
        className="animate-bento-in flex flex-col rounded-3xl bg-card border border-border p-6 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">{tAdmin.taskCenter.eyebrow}</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
              {tAdmin.taskCenter.title}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {tAdmin.taskCenter.desc}
            </p>
          </div>

          {/* Quick status counter summary */}
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted">
              {t(tAdmin.taskCenter.lotsSummary, {
                filtered: filteredLots.length,
                total: lots.length,
              })}
            </span>
          </div>
        </div>

        {/* Pestañas por estado (disputed, funded, listed, redeemed, all) */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-border-low pb-3">
          <StatusTabButton
            active={activeTab === "disputed"}
            onClick={() => setActiveTab("disputed")}
            label={tAdmin.taskCenter.tabs.disputed}
            count={lots.filter((l) => l.status === "disputed").length}
            isAlertTab
          />
          <StatusTabButton
            active={activeTab === "funded"}
            onClick={() => setActiveTab("funded")}
            label={tAdmin.taskCenter.tabs.funded}
            count={lots.filter((l) => l.status === "funded").length}
          />
          <StatusTabButton
            active={activeTab === "listed"}
            onClick={() => setActiveTab("listed")}
            label={tAdmin.taskCenter.tabs.listed}
            count={lots.filter((l) => l.status === "listed").length}
          />
          <StatusTabButton
            active={activeTab === "redeemed"}
            onClick={() => setActiveTab("redeemed")}
            label={tAdmin.taskCenter.tabs.redeemed}
            count={
              lots.filter(
                (l) => l.status === "redeemed" || l.status === "claimed"
              ).length
            }
          />
          <StatusTabButton
            active={activeTab === "all"}
            onClick={() => setActiveTab("all")}
            label={tAdmin.taskCenter.tabs.all}
            count={lots.length}
          />
        </div>

        {/* Buscador reactivo y Filtros */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-64 flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tAdmin.taskCenter.searchPlaceholder}
              className="w-full rounded-full border border-border bg-secondary py-2 pl-9 pr-8 text-xs text-foreground placeholder:text-muted focus:border-brand-600 focus:outline-hidden transition"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              {ICON_SEARCH}
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Origin selector filter */}
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
              className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-foreground font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="all">{tAdmin.taskCenter.originFilterAll}</option>
              {origins.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>

            {/* Sort order selector */}
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "newest" | "volume" | "price")
              }
              className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-foreground font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="newest">{tAdmin.taskCenter.sortNewest}</option>
              <option value="volume">{tAdmin.taskCenter.sortVolume}</option>
              <option value="price">{tAdmin.taskCenter.sortPrice}</option>
            </select>
          </div>
        </div>

        {/* List of Lots */}
        <div className="mt-5 space-y-3">
          {filteredLots.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-secondary text-muted">
                {ICON_SEARCH}
              </span>
              <p className="mt-3 text-sm font-semibold text-foreground">
                {tAdmin.taskCenter.emptyTitle}
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted">
                {searchQuery || originFilter !== "all" || activeTab !== "all"
                  ? tAdmin.taskCenter.emptyDescFiltered
                  : tAdmin.taskCenter.emptyDescInitial}
              </p>
              {(searchQuery || originFilter !== "all" || activeTab !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setOriginFilter("all");
                    setActiveTab("all");
                  }}
                  className="btn-secondary mt-4"
                >
                  {tAdmin.taskCenter.resetFilters}
                </button>
              )}
            </div>
          ) : (
            filteredLots.map((lot) => {
              const settlement = calculateLotSettlement(
                Number(lot.price_usdc || 0),
                100
              );
              const isDisputed = lot.status === "disputed";

              return (
                <div
                  key={lot.pda_address || lot.lot_id}
                  className={`flex flex-col gap-3 rounded-2xl border p-4 transition ${
                    isDisputed
                      ? "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60"
                      : "border-border-low bg-card hover:border-border hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">
                        {lot.lot_id}
                      </span>
                      <StatusBadge status={lot.status as LotStatus} />
                      <span className="text-xs text-muted">
                        · {resolveOriginName(lot.origin_id)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedLot(lot)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition active:scale-[0.97] cursor-pointer ${
                          isDisputed
                            ? "bg-amber-600 text-white hover:bg-amber-700"
                            : "btn-secondary"
                        }`}
                      >
                        {isDisputed ? tAdmin.taskCenter.superviseDispute : tAdmin.taskCenter.inspect}
                      </button>

                      <Link
                        href={`/lote/${lot.lot_id}`}
                        className="btn-secondary"
                        target="_blank"
                      >
                        {tAdmin.taskCenter.passportLink}
                      </Link>

                      <a
                        href={getExplorerUrl(
                          `/address/${lot.pda_address}`,
                          cluster
                        )}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Ver cuenta PDA en Explorer"
                        className="grid size-7 place-items-center rounded-full bg-secondary text-xs text-muted hover:text-foreground transition active:scale-[0.97]"
                      >
                        ↗
                      </a>
                    </div>
                  </div>

                  {/* Metrics and details row */}
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 sm:gap-4 border-t border-border-low pt-3">
                    <div>
                      <p className="text-[11px] text-muted">{tAdmin.taskCenter.thVolumePurity}</p>
                      <p className="mt-0.5 font-semibold text-foreground">
                        {numFmt.format(Number(lot.volume_tonnes || 0))} t Li₂CO₃
                        <span className="ml-1 text-[11px] font-normal text-muted">
                          ({numFmt.format(Number(lot.purity_pct || 0))}%)
                        </span>
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] text-muted">{tAdmin.taskCenter.thPrice}</p>
                      <p className="mt-0.5 font-semibold text-foreground font-mono">
                        ${priceFmt.format(Number(lot.price_usdc || 0))} USDC
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] text-muted">{tAdmin.taskCenter.thFee}</p>
                      <p className="mt-0.5 font-semibold text-brand-700 font-mono">
                        ${priceFmt.format(settlement.feeUsdc)} USDC
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] text-muted">{tAdmin.taskCenter.thParties}</p>
                      <p className="mt-0.5 truncate text-[11px] text-foreground">
                        <span className="font-medium">Prod:</span>{" "}
                        {lot.producer_name || ellipsify(lot.producer_wallet, 4)}{" "}
                        · <span className="font-medium">Comp:</span>{" "}
                        {lot.buyer_name || ellipsify(lot.buyer_wallet, 4)}
                      </p>
                    </div>
                  </div>

                  {/* Disputed lot alert banner */}
                  {isDisputed && (
                    <div className="mt-1 flex items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                        {tAdmin.taskCenter.disputeAlert}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedLot(lot)}
                        className="font-semibold underline hover:no-underline ml-2"
                      >
                        {tAdmin.taskCenter.viewMediation}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 4. DIRECTORIO Y GESTIÓN DE EMPRESAS DEL PROTOCOLO */}
      <section
        id="companies-directory"
        style={{ "--bento-i": 8 } as CSSProperties}
        className="animate-bento-in flex flex-col rounded-3xl bg-card border border-border p-6 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">{tAdmin.companies.eyebrow}</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
              {tAdmin.companies.title}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {tAdmin.companies.desc}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsRegisterCompanyOpen(true)}
            className="btn-primary cursor-pointer inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
          >
            <span>+</span>
            <span>{tAdmin.companies.createBtn}</span>
          </button>
        </div>

        {/* Resumen de participantes */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-border-low bg-secondary/50 p-3.5">
            <p className="text-[11px] text-muted">{tAdmin.companies.kpiTotal}</p>
            <p className="mt-0.5 font-mono text-xl font-bold text-foreground">
              {companies.length}
            </p>
            <p className="text-[10px] text-muted">{tAdmin.companies.kpiTotalHint}</p>
          </div>
          <div className="rounded-2xl border border-border-low bg-secondary/50 p-3.5">
            <p className="text-[11px] text-muted">{tAdmin.companies.kpiProducers}</p>
            <p className="mt-0.5 font-mono text-xl font-bold text-brand-700">
              {companies.filter((c) => c.company_type === "producer").length}
            </p>
            <p className="text-[10px] text-muted">{tAdmin.companies.kpiProducersHint}</p>
          </div>
          <div className="rounded-2xl border border-border-low bg-secondary/50 p-3.5">
            <p className="text-[11px] text-muted">{tAdmin.companies.kpiBuyers}</p>
            <p className="mt-0.5 font-mono text-xl font-bold text-emerald-700">
              {companies.filter((c) => c.company_type === "buyer").length}
            </p>
            <p className="text-[10px] text-muted">{tAdmin.companies.kpiBuyersHint}</p>
          </div>
          <div className="rounded-2xl border border-border-low bg-secondary/50 p-3.5">
            <p className="text-[11px] text-muted">{tAdmin.companies.kpiWallets}</p>
            <p className="mt-0.5 font-mono text-xl font-bold text-foreground">
              {companies.filter((c) => Boolean(c.wallet_address)).length}
            </p>
            <p className="text-[10px] text-muted">{tAdmin.companies.kpiWalletsHint}</p>
          </div>
        </div>

        {/* Lista de empresas */}
        <div className="mt-4 divide-y divide-border-low overflow-hidden rounded-2xl border border-border-low">
          {companies.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              {tAdmin.companies.empty}
            </div>
          ) : (
            companies.map((c) => {
              const isProducer = c.company_type === "producer";
              const isBuyer = c.company_type === "buyer";

              return (
                <div
                  key={c.id}
                  className="flex flex-col gap-3 p-4 transition hover:bg-secondary/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {c.name}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isProducer
                            ? "bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300"
                            : isBuyer
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                        }`}
                      >
                        {isProducer
                          ? dict.roles.producer
                          : isBuyer
                            ? dict.roles.buyer
                            : dict.roles.admin}
                      </span>
                      {c.origin_id && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted">
                          {resolveOriginName(c.origin_id)}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      {c.email && (
                        <span className="font-mono text-[11px] text-muted">
                          {c.email}
                        </span>
                      )}
                      {isProducer && c.purity_pct && (
                        <span>
                          {tAdmin.companies.purityPrefix}{" "}
                          <strong className="text-foreground font-mono">
                            {c.purity_pct}%
                          </strong>
                        </span>
                      )}
                      {isProducer && c.water_footprint_m3_per_tonne && (
                        <span>
                          {tAdmin.companies.waterPrefix}{" "}
                          <strong className="text-foreground font-mono">
                            {c.water_footprint_m3_per_tonne} m³/t
                          </strong>
                        </span>
                      )}
                      <span>
                        {tAdmin.companies.registeredOn}{" "}
                        {new Date(c.created_at).toLocaleDateString(dict.numLocale, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Wallet & Explorer */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    {c.wallet_address ? (
                      <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs">
                        <span className="font-mono text-[11px] text-foreground">
                          {ellipsify(c.wallet_address, 4)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(c.wallet_address!, "Wallet")
                          }
                          className="cursor-pointer text-muted hover:text-foreground text-[10px]"
                          title="Copiar wallet"
                        >
                          {tAdmin.treasury.copyBtn}
                        </button>
                        <a
                          href={getExplorerUrl(
                            `/address/${c.wallet_address}`,
                            cluster
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted hover:text-foreground text-[10px]"
                          title="Solana Explorer"
                        >
                          ↗
                        </a>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted italic">
                        {tAdmin.companies.noWallet}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 5. DIRECTORIO Y GESTIÓN DE SALARES U ORÍGENES */}
      <section
        id="origins-directory"
        style={{ "--bento-i": 9 } as CSSProperties}
        className="animate-bento-in flex flex-col rounded-3xl bg-card border border-border p-6 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">{tAdmin.origins.eyebrow}</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
              {tAdmin.origins.title}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {tAdmin.origins.desc}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsRegisterOriginOpen(true)}
            className="btn-primary cursor-pointer inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
          >
            <span>+</span>
            <span>{tAdmin.origins.createBtn}</span>
          </button>
        </div>

        {/* Resumen de orígenes */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border-low bg-secondary/50 p-3.5">
            <p className="text-[11px] text-muted">{tAdmin.origins.kpiTotal}</p>
            <p className="mt-0.5 font-mono text-xl font-bold text-foreground">
              {origins.length}
            </p>
            <p className="text-[10px] text-muted">{tAdmin.origins.kpiTotalHint}</p>
          </div>
          <div className="rounded-2xl border border-border-low bg-secondary/50 p-3.5">
            <p className="text-[11px] text-muted">{tAdmin.origins.kpiCapacity}</p>
            <p className="mt-0.5 font-mono text-xl font-bold text-brand-700">
              {numFmt.format(origins.reduce((acc, o) => acc + (o.capacity_tpa || 0), 0))} t
            </p>
            <p className="text-[10px] text-muted">{tAdmin.origins.kpiCapacityHint}</p>
          </div>
          <div className="rounded-2xl border border-border-low bg-secondary/50 p-3.5">
            <p className="text-[11px] text-muted">{tAdmin.origins.kpiElevation}</p>
            <p className="mt-0.5 font-mono text-xl font-bold text-foreground">
              {numFmt.format(
                Math.round(
                  origins.filter((o) => o.altitude_m).reduce((acc, o) => acc + (o.altitude_m || 0), 0) /
                    (origins.filter((o) => o.altitude_m).length || 1)
                )
              )}{" "}
              <span className="text-xs font-normal text-muted">msnm</span>
            </p>
            <p className="text-[10px] text-muted">{tAdmin.origins.kpiElevationHint}</p>
          </div>
        </div>

        {/* Lista de salares */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {origins.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted col-span-2">
              {tAdmin.origins.empty}
            </div>
          ) : (
            origins.map((o) => (
              <div
                key={o.id}
                className="flex flex-col justify-between rounded-2xl border border-border-low bg-card p-4 transition hover:border-border hover:bg-secondary/40"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 px-2 py-0.5">
                        {o.code}
                      </span>
                      <h3 className="text-sm font-semibold text-foreground">
                        {o.name}
                      </h3>
                    </div>
                    <Link
                      href="/account/catalogo"
                      className="text-[11px] font-medium text-brand-700 hover:underline"
                    >
                      {tAdmin.origins.view3dMap}
                    </Link>
                  </div>

                  <p className="mt-1 text-xs text-muted font-medium">
                    {o.producer}
                  </p>
                  <p className="text-[11px] text-muted truncate mt-0.5">
                    {o.shareholders}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border-low grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] text-muted">{tAdmin.origins.capacityLabel}</p>
                    <p className="font-mono font-semibold text-foreground">
                      {numFmt.format(o.capacity_tpa)} t
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted">{tAdmin.origins.altitudeLabel}</p>
                    <p className="font-mono font-semibold text-foreground">
                      {o.altitude_m ? `${numFmt.format(o.altitude_m)} m` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted">{tAdmin.origins.waterLabel}</p>
                    <p className="font-mono font-semibold text-brand-700">
                      {o.water_m3_per_tonne ? `${numFmt.format(o.water_m3_per_tonne)} m³/t` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 6. MODAL DE INSPECCIÓN Y MEDIACIÓN DE DISPUTAS */}
      {selectedLot && (
        <LotInspectionDialog
          lot={selectedLot}
          cluster={cluster}
          origins={origins}
          onClose={() => setSelectedLot(null)}
          onCopy={copyToClipboard}
        />
      )}

      {/* 7. MODAL PARA CARGAR COMPAÑÍA */}
      {isRegisterCompanyOpen && (
        <CreateCompanyDialog
          origins={origins}
          onClose={() => setIsRegisterCompanyOpen(false)}
          onSuccess={(newComp) => {
            setCompanies((prev) => [newComp, ...prev]);
            setIsRegisterCompanyOpen(false);
          }}
        />
      )}

      {/* 8. MODAL PARA CARGAR SALAR U ORIGEN */}
      {isRegisterOriginOpen && (
        <CreateOriginDialog
          onClose={() => setIsRegisterOriginOpen(false)}
          onSuccess={(newOrigin) => {
            setOrigins((prev) => [newOrigin, ...prev]);
            setIsRegisterOriginOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUBCOMPONENTS
// ---------------------------------------------------------------------------

function BentoKpiCard({
  index,
  icon,
  label,
  value,
  unit,
  badge,
  badgeVariant = "default",
  hint,
  onClick,
}: {
  index: number;
  icon: ReactNode;
  label: string;
  value: string;
  unit?: string;
  badge?: string;
  badgeVariant?: "default" | "warning" | "success";
  hint: string;
  onClick?: () => void;
}) {
  return (
    <div
      style={{ "--bento-i": index } as CSSProperties}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`animate-bento-in flex flex-col rounded-3xl bg-card border border-border p-5 shadow-xs transition ${
        onClick
          ? "cursor-pointer hover:border-brand-600 hover:shadow-sm active:scale-[0.98]"
          : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">{label}</p>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-brand-700">
          {icon}
        </span>
      </div>

      <p className="mt-4 font-mono text-3xl font-bold tabular-nums tracking-tight text-foreground">
        {value}
        {unit && (
          <span className="ml-1 text-sm font-normal text-muted">{unit}</span>
        )}
      </p>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted leading-tight truncate">{hint}</p>
        {badge && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              badgeVariant === "warning"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                : badgeVariant === "success"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "bg-secondary text-muted"
            }`}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

function StatusTabButton({
  active,
  onClick,
  label,
  count,
  isAlertTab = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  isAlertTab?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-[0.97] ${
        active
          ? isAlertTab && count > 0
            ? "bg-amber-600 text-white"
            : "bg-primary text-primary-foreground"
          : isAlertTab && count > 0
            ? "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
            : "bg-secondary text-muted hover:bg-accent hover:text-foreground"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
          active
            ? "bg-white/20 text-white"
            : isAlertTab && count > 0
              ? "bg-amber-600 text-white"
              : "bg-card text-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function LotInspectionDialog({
  lot,
  cluster,
  origins = [],
  onClose,
  onCopy,
}: {
  lot: AdminLot;
  cluster: Parameters<typeof getExplorerUrl>[1];
  origins?: Origin[];
  onClose: () => void;
  onCopy: (text: string, label: string) => void;
}) {
  const dict = useAccountDict();
  const tLot = dict.adminDashboard.lotInspection;
  const priceFmt = useMemo(
    () =>
      new Intl.NumberFormat(dict.numLocale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [dict.numLocale]
  );
  const settlement = calculateLotSettlement(Number(lot.price_usdc || 0), 100);
  const isDisputed = lot.status === "disputed";
  const lotOriginName =
    origins.find((o) => o.id === lot.origin_id)?.name ||
    originName(lot.origin_id) ||
    lot.origin_id;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
    >
      <div
        className="animate-modal-in flex flex-col w-full max-w-2xl max-h-[90vh] rounded-3xl bg-card border border-border p-6 shadow-2xl overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-low pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-foreground">
                {lot.lot_id}
              </span>
              <StatusBadge status={lot.status as LotStatus} />
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {tLot.originPrefix} {lotOriginName} · {tLot.indexedOn}{" "}
              {new Date(lot.indexed_at).toLocaleDateString(dict.numLocale, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-secondary text-muted hover:text-foreground active:scale-[0.97]"
          >
            ✕
          </button>
        </div>

        {/* Dispute Resolution Panel if lot is disputed */}
        {isDisputed && (
          <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-950 dark:text-amber-200">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
              <span className="size-2 rounded-full bg-amber-500 animate-ping" />
              {tLot.disputeMediationTitle}
            </div>
            <p className="mt-2 leading-relaxed">
              {t(tLot.disputeMediationBody, {
                buyer: lot.buyer_name || lot.buyer_wallet,
              })}
            </p>
            <div className="mt-3 rounded-xl bg-card/80 p-3 text-[11px] space-y-1.5 border border-amber-500/20">
              <p className="font-semibold text-foreground">
                {tLot.adminRecommendationsTitle}
              </p>
              <p className="text-muted">{tLot.adminRec1}</p>
              <p className="text-muted">{tLot.adminRec2}</p>
              <p className="text-muted">{tLot.adminRec3}</p>
            </div>
          </div>
        )}

        {/* Settlement Financial Breakdown */}
        <div className="mt-4 rounded-2xl bg-secondary p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {tLot.settlementTitle}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div>
              <p className="text-[11px] text-muted">{tLot.totalPrice}</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-foreground">
                ${priceFmt.format(Number(lot.price_usdc || 0))} USDC
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted">{tLot.protocolFee}</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-brand-700">
                ${priceFmt.format(settlement.feeUsdc)} USDC
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted">{tLot.netProducer}</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-foreground">
                ${priceFmt.format(settlement.producerPayoutUsdc)} USDC
              </p>
            </div>
          </div>
        </div>

        {/* Parties involved */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-2xl border border-border p-3.5">
            <p className="text-[11px] font-semibold text-muted">
              {tLot.producerTitle}
            </p>
            <p className="mt-1 font-semibold text-foreground">
              {lot.producer_name || tLot.producerFallback}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-muted truncate">
              {lot.producer_wallet}
            </p>
            <button
              type="button"
              onClick={() =>
                onCopy(lot.producer_wallet, tLot.producerTitle)
              }
              className="mt-2 text-[10px] font-semibold text-brand-700 hover:underline"
            >
              {tLot.copyWallet}
            </button>
          </div>

          <div className="rounded-2xl border border-border p-3.5">
            <p className="text-[11px] font-semibold text-muted">
              {tLot.buyerTitle}
            </p>
            <p className="mt-1 font-semibold text-foreground">
              {lot.buyer_name || tLot.buyerFallback}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-muted truncate">
              {lot.buyer_wallet}
            </p>
            <button
              type="button"
              onClick={() =>
                onCopy(lot.buyer_wallet, tLot.buyerTitle)
              }
              className="mt-2 text-[10px] font-semibold text-brand-700 hover:underline"
            >
              {tLot.copyWallet}
            </button>
          </div>
        </div>

        {/* On-chain cryptographic references */}
        <div className="mt-4 space-y-2 text-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {tLot.onchainAccountsTitle}
          </p>

          <div className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2">
            <div>
              <p className="text-[10px] text-muted">{tLot.pdaEscrow}</p>
              <p className="font-mono text-xs text-foreground">
                {ellipsify(lot.pda_address, 10)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCopy(lot.pda_address, tLot.pdaEscrow)}
              className="btn-secondary py-1 text-[11px]"
            >
              {tLot.copyBtn}
            </button>
          </div>

          {lot.mint_address && (
            <div className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2">
              <div>
                <p className="text-[10px] text-muted">{tLot.mintNft}</p>
                <p className="font-mono text-xs text-foreground">
                  {ellipsify(lot.mint_address, 10)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onCopy(lot.mint_address!, tLot.mintNft)}
                className="btn-secondary py-1 text-[11px]"
              >
                {tLot.copyBtn}
              </button>
            </div>
          )}

          {lot.fund_tx_signature && (
            <div className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2">
              <div>
                <p className="text-[10px] text-muted">{tLot.fundTx}</p>
                <p className="font-mono text-xs text-foreground">
                  {ellipsify(lot.fund_tx_signature, 10)}
                </p>
              </div>
              <a
                href={getExplorerUrl(`/tx/${lot.fund_tx_signature}`, cluster)}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary py-1 text-[11px]"
              >
                {tLot.explorerBtn}
              </a>
            </div>
          )}

          {lot.redeem_tx_signature && (
            <div className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2">
              <div>
                <p className="text-[10px] text-muted">{tLot.redeemTx}</p>
                <p className="font-mono text-xs text-foreground">
                  {ellipsify(lot.redeem_tx_signature, 10)}
                </p>
              </div>
              <a
                href={getExplorerUrl(`/tx/${lot.redeem_tx_signature}`, cluster)}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary py-1 text-[11px]"
              >
                {tLot.explorerBtn}
              </a>
            </div>
          )}

          {lot.dispute_tx_signature && (
            <div className="flex items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2">
              <div>
                <p className="text-[10px] text-amber-800 dark:text-amber-300">
                  {tLot.disputeTx}
                </p>
                <p className="font-mono text-xs text-foreground">
                  {ellipsify(lot.dispute_tx_signature, 10)}
                </p>
              </div>
              <a
                href={getExplorerUrl(`/tx/${lot.dispute_tx_signature}`, cluster)}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary py-1 text-[11px]"
              >
                {tLot.explorerBtn}
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2 border-t border-border-low pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            {tLot.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG ICONS
// ---------------------------------------------------------------------------

const ICON_USDC = (
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
);

const ICON_VOLUME = (
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
);

const ICON_ESCROW = (
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
);

const ICON_ALERT = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-4"
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

const ICON_LEAF = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-4"
  >
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
);

const ICON_SEARCH = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-3.5"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

function CreateCompanyDialog({
  origins = [],
  onClose,
  onSuccess,
}: {
  origins?: Origin[];
  onClose: () => void;
  onSuccess: (company: AdminCompany) => void;
}) {
  const dict = useAccountDict();
  const tComp = dict.adminDashboard.createCompanyModal;

  const [name, setName] = useState("");
  const [companyType, setCompanyType] = useState<CompanyType>("producer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("julit-demo-2026");
  const [walletAddress, setWalletAddress] = useState("");
  const [originId, setOriginId] = useState<string>(
    origins[0]?.id || ORIGINS[0]?.id || "pena_blanca"
  );
  const [purityPct, setPurityPct] = useState("99.60");
  const [waterFootprint, setWaterFootprint] = useState("52.00");
  const [carbonFootprint, setCarbonFootprint] = useState("8900");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        name,
        company_type: companyType,
        email,
        password,
        wallet_address: walletAddress.trim() || undefined,
      };

      if (companyType === "producer") {
        payload.origin_id = originId;
        if (purityPct) payload.purity_pct = Number(purityPct);
        if (waterFootprint) payload.water_footprint_m3_per_tonne = Number(waterFootprint);
        if (carbonFootprint) payload.carbon_footprint_kg_co2e_per_tonne = Number(carbonFootprint);
      }

      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar la empresa.");
      }

      toast.success(tComp.successToast);
      onSuccess(data.company);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const originsList = origins.length > 0 ? origins : ORIGINS;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
    >
      <div className="animate-modal-in flex flex-col w-full max-w-lg max-h-[90vh] rounded-3xl bg-card border border-border p-6 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border-low pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {tComp.title}
            </h2>
            <p className="text-xs text-muted">
              {tComp.desc}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer grid size-8 place-items-center rounded-full bg-secondary text-muted hover:text-foreground active:scale-[0.97]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {/* Selector de Tipo de Empresa */}
          <div>
            <label className="text-xs font-semibold text-foreground">
              {tComp.typeLabel}
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCompanyType("producer")}
                className={`cursor-pointer rounded-2xl border p-3 text-left transition ${
                  companyType === "producer"
                    ? "border-brand-600 bg-brand-50/50 dark:bg-brand-950/30 text-foreground"
                    : "border-border-low bg-secondary/50 text-muted hover:bg-secondary"
                }`}
              >
                <p className="text-xs font-bold">{tComp.producerTitle}</p>
                <p className="text-[10px] text-muted leading-tight mt-0.5">
                  {tComp.producerDesc}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setCompanyType("buyer")}
                className={`cursor-pointer rounded-2xl border p-3 text-left transition ${
                  companyType === "buyer"
                    ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-foreground"
                    : "border-border-low bg-secondary/50 text-muted hover:bg-secondary"
                }`}
              >
                <p className="text-xs font-bold">{tComp.buyerTitle}</p>
                <p className="text-[10px] text-muted leading-tight mt-0.5">
                  {tComp.buyerDesc}
                </p>
              </button>
            </div>
          </div>

          {/* Nombre de la Empresa */}
          <div>
            <label htmlFor="comp-name" className="text-xs font-semibold text-foreground">
              {tComp.nameLabel}
            </label>
            <input
              id="comp-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tComp.namePlaceholder}
              className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-brand-600 focus:outline-hidden"
            />
          </div>

          {/* Email y Contraseña */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="comp-email" className="text-xs font-semibold text-foreground">
                {tComp.emailLabel}
              </label>
              <input
                id="comp-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tComp.emailPlaceholder}
                className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-brand-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label htmlFor="comp-pass" className="text-xs font-semibold text-foreground">
                {tComp.passwordLabel}
              </label>
              <input
                id="comp-pass"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="julit-demo-2026"
                className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-brand-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Wallet Solana */}
          <div>
            <label htmlFor="comp-wallet" className="text-xs font-semibold text-foreground">
              {tComp.walletLabel}
            </label>
            <input
              id="comp-wallet"
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder={tComp.walletPlaceholder}
              className="mt-1 w-full font-mono rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-brand-600 focus:outline-hidden"
            />
          </div>

          {/* Campos específicos de Productor */}
          {companyType === "producer" && (
            <div className="rounded-2xl border border-border-low bg-secondary/30 p-3 space-y-3">
              <p className="text-[11px] font-bold text-foreground">
                {tComp.producerParamsTitle}
              </p>

              <div>
                <label htmlFor="comp-origin" className="text-xs font-semibold text-foreground">
                  {tComp.originLabel}
                </label>
                <select
                  id="comp-origin"
                  value={originId}
                  onChange={(e) => setOriginId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-brand-600 focus:outline-hidden"
                >
                  {originsList.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="comp-purity" className="text-[10px] font-semibold text-muted">
                    {tComp.purityLabel}
                  </label>
                  <input
                    id="comp-purity"
                    type="number"
                    step="0.01"
                    min="99.50"
                    max="100.00"
                    value={purityPct}
                    onChange={(e) => setPurityPct(e.target.value)}
                    className="mt-1 w-full font-mono rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-brand-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label htmlFor="comp-water" className="text-[10px] font-semibold text-muted">
                    {tComp.waterLabel}
                  </label>
                  <input
                    id="comp-water"
                    type="number"
                    step="0.01"
                    min="0"
                    value={waterFootprint}
                    onChange={(e) => setWaterFootprint(e.target.value)}
                    className="mt-1 w-full font-mono rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-brand-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label htmlFor="comp-carbon" className="text-[10px] font-semibold text-muted">
                    {tComp.carbonLabel}
                  </label>
                  <input
                    id="comp-carbon"
                    type="number"
                    step="1"
                    min="0"
                    value={carbonFootprint}
                    onChange={(e) => setCarbonFootprint(e.target.value)}
                    className="mt-1 w-full font-mono rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-brand-600 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-2.5">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-low">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer rounded-full border border-border bg-secondary px-4 py-2 text-xs font-medium text-muted hover:text-foreground active:scale-[0.97]"
            >
              {tComp.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary cursor-pointer rounded-full px-5 py-2 text-xs font-semibold disabled:opacity-50"
            >
              {isSubmitting ? tComp.submitting : tComp.submitBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateOriginDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (origin: Origin) => void;
}) {
  const dict = useAccountDict();
  const tModal = dict.adminDashboard.createOriginModal;

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [producer, setProducer] = useState("");
  const [shareholders, setShareholders] = useState("");
  const [latitude, setLatitude] = useState("-23.46293");
  const [longitude, setLongitude] = useState("-66.70248");
  const [capacityTpa, setCapacityTpa] = useState("35000");
  const [altitudeM, setAltitudeM] = useState("3900");
  const [waterFootprint, setWaterFootprint] = useState("48.50");
  const [note, setNote] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/origins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          producer: producer.trim(),
          shareholders: shareholders.trim(),
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          capacity_tpa: parseInt(capacityTpa, 10),
          altitude_m: altitudeM ? parseInt(altitudeM, 10) : null,
          water_m3_per_tonne: waterFootprint ? parseFloat(waterFootprint) : null,
          note: note.trim(),
          source_label: sourceLabel.trim(),
          source_url: sourceUrl.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || tModal.errorToast);
      }

      toast.success(tModal.successToast);
      onSuccess(data.origin);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : tModal.errorToast;
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
    >
      <div className="animate-modal-in flex flex-col w-full max-w-lg max-h-[90vh] rounded-3xl bg-card border border-border p-6 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border-low pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {tModal.title}
            </h2>
            <p className="text-xs text-muted">
              {tModal.desc}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer grid size-8 place-items-center rounded-full bg-secondary text-muted hover:text-foreground active:scale-[0.97]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {/* Nombre y Código */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="orig-name" className="text-xs font-semibold text-foreground">
                {tModal.nameLabel}
              </label>
              <input
                id="orig-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tModal.namePlaceholder}
                className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-brand-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label htmlFor="orig-code" className="text-xs font-semibold text-foreground">
                {tModal.codeLabel}
              </label>
              <input
                id="orig-code"
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={tModal.codePlaceholder}
                maxLength={10}
                className="mt-1 w-full font-mono uppercase rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-brand-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Productor y Accionistas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="orig-prod" className="text-xs font-semibold text-foreground">
                {tModal.producerLabel}
              </label>
              <input
                id="orig-prod"
                type="text"
                required
                value={producer}
                onChange={(e) => setProducer(e.target.value)}
                placeholder={tModal.producerPlaceholder}
                className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-brand-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label htmlFor="orig-share" className="text-xs font-semibold text-foreground">
                {tModal.shareholdersLabel}
              </label>
              <input
                id="orig-share"
                type="text"
                value={shareholders}
                onChange={(e) => setShareholders(e.target.value)}
                placeholder={tModal.shareholdersPlaceholder}
                className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-brand-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Coordenadas de Planta */}
          <div className="rounded-2xl border border-border-low bg-secondary/30 p-3 space-y-2">
            <p className="text-[11px] font-bold text-foreground">
              {tModal.coordsTitle}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="orig-lat" className="text-[10px] font-semibold text-muted">
                  {tModal.latLabel}
                </label>
                <input
                  id="orig-lat"
                  type="number"
                  step="0.00001"
                  required
                  min="-90"
                  max="90"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="mt-1 w-full font-mono rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-brand-600 focus:outline-hidden"
                />
              </div>
              <div>
                <label htmlFor="orig-lng" className="text-[10px] font-semibold text-muted">
                  {tModal.lngLabel}
                </label>
                <input
                  id="orig-lng"
                  type="number"
                  step="0.00001"
                  required
                  min="-180"
                  max="180"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="mt-1 w-full font-mono rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-brand-600 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Capacidad, Altitud, Agua */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="orig-cap" className="text-[10px] font-semibold text-muted">
                {tModal.capacityLabel}
              </label>
              <input
                id="orig-cap"
                type="number"
                required
                min="1"
                step="1"
                value={capacityTpa}
                onChange={(e) => setCapacityTpa(e.target.value)}
                className="mt-1 w-full font-mono rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-brand-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label htmlFor="orig-alt" className="text-[10px] font-semibold text-muted">
                {tModal.altitudeLabel}
              </label>
              <input
                id="orig-alt"
                type="number"
                min="0"
                step="1"
                value={altitudeM}
                onChange={(e) => setAltitudeM(e.target.value)}
                className="mt-1 w-full font-mono rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-brand-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label htmlFor="orig-water" className="text-[10px] font-semibold text-muted">
                {tModal.waterLabel}
              </label>
              <input
                id="orig-water"
                type="number"
                step="0.01"
                min="0"
                value={waterFootprint}
                onChange={(e) => setWaterFootprint(e.target.value)}
                className="mt-1 w-full font-mono rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-brand-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Notas y Fuente */}
          <div className="space-y-3">
            <div>
              <label htmlFor="orig-note" className="text-[10px] font-semibold text-muted">
                {tModal.noteLabel}
              </label>
              <input
                id="orig-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Datos de referencia y caracterización técnica."
                className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-brand-600 focus:outline-hidden"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="orig-source" className="text-[10px] font-semibold text-muted">
                  {tModal.sourceLabel}
                </label>
                <input
                  id="orig-source"
                  type="text"
                  value={sourceLabel}
                  onChange={(e) => setSourceLabel(e.target.value)}
                  placeholder="Informe Técnico 2026"
                  className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-brand-600 focus:outline-hidden"
                />
              </div>
              <div>
                <label htmlFor="orig-url" className="text-[10px] font-semibold text-muted">
                  {tModal.sourceUrlLabel}
                </label>
                <input
                  id="orig-url"
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://julit.dev"
                  className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-brand-600 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-2.5">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-low">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer rounded-full border border-border bg-secondary px-4 py-2 text-xs font-medium text-muted hover:text-foreground active:scale-[0.97]"
            >
              {tModal.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary cursor-pointer rounded-full px-5 py-2 text-xs font-semibold disabled:opacity-50"
            >
              {isSubmitting ? tModal.submitting : tModal.submitBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
