import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { AdminDashboard } from "./admin-dashboard";
import type { AccountCompany } from "../account-client";
import type { AdminLot, ProtocolStats } from "../account-data";
import { AccountI18nProvider } from "../i18n/context";
import { en } from "../i18n/en";

const mockCompany: AccountCompany = {
  name: "JuLit Protocol Admin",
  companyType: "admin",
  walletAddress: "AdminWa11et11111111111111111111111111111111",
  walletVerifiedAt: "2026-10-08T00:00:00Z",
  originId: null,
  purityPct: null,
  waterM3PerTonne: null,
  carbonKgCo2ePerTonne: null,
};

const mockStats: ProtocolStats = {
  companies: {
    total: 4,
    producers: 2,
    buyers: 1,
    admins: 1,
    verifiedWallets: 3,
  },
  contracts: {
    total: 3,
    pending: 1,
    accepted: 2,
    revoked: 0,
  },
  lots: {
    total: 4,
    byStatus: {
      listed: 1,
      funded: 1,
      disputed: 1,
      redeemed: 1,
      claimed: 0,
      cancelled: 0,
    },
    totalVolumeTonnes: 380,
    settledVolumeTonnes: 150,
    listedVolumeTonnes: 80,
    fundedVolumeTonnes: 100,
    totalValueUsdc: 545000,
    settledValueUsdc: 200000,
    escrowedValueUsdc: 225000,
    estimatedProtocolFeesUsdc: 2000,
  },
};

const mockLots: AdminLot[] = [
  {
    lot_id: "LOT-DISP-001",
    pda_address: "PdaDisp111111111111111111111111111111111",
    status: "disputed",
    volume_tonnes: 50,
    purity_pct: 99.52,
    water_footprint_m3_per_tonne: 52.4,
    carbon_footprint_kg_co2e_per_tonne: 8400,
    price_usdc: 75000,
    producer_wallet: "Prod111111111111111111111111111111111111",
    buyer_wallet: "Buyer11111111111111111111111111111111111",
    producer_name: "Sales del Altiplano S.A.",
    buyer_name: "Comprador Demo",
    mint_address: "Mint111111111111111111111111111111111111",
    claimable_after: 1791550000,
    origin_id: "pena_blanca",
    fund_tx_signature: "SigFund111",
    redeem_tx_signature: null,
    dispute_tx_signature: "SigDisp111",
    claim_tx_signature: null,
    indexed_at: "2026-10-07T12:00:00Z",
  },
  {
    lot_id: "LOT-FUND-002",
    pda_address: "PdaFund222222222222222222222222222222222",
    status: "funded",
    volume_tonnes: 100,
    purity_pct: 99.6,
    water_footprint_m3_per_tonne: 61.2,
    carbon_footprint_kg_co2e_per_tonne: 8900,
    price_usdc: 150000,
    producer_wallet: "Prod222222222222222222222222222222222222",
    buyer_wallet: "Buyer11111111111111111111111111111111111",
    producer_name: "Minera Cóndor S.A.",
    buyer_name: "Comprador Demo",
    mint_address: "Mint222222222222222222222222222222222222",
    claimable_after: 1791650000,
    origin_id: "condor",
    fund_tx_signature: "SigFund222",
    redeem_tx_signature: null,
    dispute_tx_signature: null,
    claim_tx_signature: null,
    indexed_at: "2026-10-06T12:00:00Z",
  },
  {
    lot_id: "LOT-LIST-003",
    pda_address: "PdaList333333333333333333333333333333333",
    status: "listed",
    volume_tonnes: 80,
    purity_pct: 99.55,
    water_footprint_m3_per_tonne: 55.0,
    carbon_footprint_kg_co2e_per_tonne: 8300,
    price_usdc: 120000,
    producer_wallet: "Prod111111111111111111111111111111111111",
    buyer_wallet: "Buyer11111111111111111111111111111111111",
    producer_name: "Sales del Altiplano S.A.",
    buyer_name: "Comprador Demo",
    mint_address: null,
    claimable_after: null,
    origin_id: "pena_blanca",
    fund_tx_signature: null,
    redeem_tx_signature: null,
    dispute_tx_signature: null,
    claim_tx_signature: null,
    indexed_at: "2026-10-05T12:00:00Z",
  },
  {
    lot_id: "LOT-REDM-004",
    pda_address: "PdaRedm444444444444444444444444444444444",
    status: "redeemed",
    volume_tonnes: 150,
    purity_pct: 99.65,
    water_footprint_m3_per_tonne: 58.0,
    carbon_footprint_kg_co2e_per_tonne: 8700,
    price_usdc: 200000,
    producer_wallet: "Prod222222222222222222222222222222222222",
    buyer_wallet: "Buyer11111111111111111111111111111111111",
    producer_name: "Minera Cóndor S.A.",
    buyer_name: "Comprador Demo",
    mint_address: "Mint444444444444444444444444444444444444",
    claimable_after: null,
    origin_id: "condor",
    fund_tx_signature: "SigFund444",
    redeem_tx_signature: "SigRedm444",
    dispute_tx_signature: null,
    claim_tx_signature: null,
    indexed_at: "2026-10-04T12:00:00Z",
  },
];

describe("AdminDashboard Component", () => {
  it("renders Hero financial KPIs with correct labels and formatted values", () => {
    const html = renderToString(
      <AdminDashboard
        company={mockCompany}
        initialStats={mockStats}
        initialLots={mockLots}
      />
    );

    // Hero KPI 1: Comisiones del protocolo
    expect(html).toContain("Comisiones del Protocolo");
    expect(html).toContain("1% Take Rate");

    // Hero KPI 2: Volumen LCE
    expect(html).toContain("Volumen Total Li₂CO₃");
    expect(html).toContain("t LCE");

    // Hero KPI 3: Lotes en Escrow
    expect(html).toContain("En Custodia Escrow");
  });

  it("renders Treasury card with correct parameters and devnet references", () => {
    const html = renderToString(
      <AdminDashboard
        company={mockCompany}
        initialStats={mockStats}
        initialLots={mockLots}
      />
    );

    expect(html).toContain("Tesorería On-Chain");
    expect(html).toContain("Bóveda y Parámetros del Protocolo");
    expect(html).toContain("100 bps");
    expect(html).toContain("Saldo SOL");
    expect(html).toContain("Saldo USDC");
  });

  it("does not render operational alerts KPI or ESG monitoring card", () => {
    const html = renderToString(
      <AdminDashboard
        company={mockCompany}
        initialStats={mockStats}
        initialLots={mockLots}
      />
    );

    expect(html).not.toContain("Alertas Operativas");
    expect(html).not.toContain("Monitoreo ESG");
    expect(html).not.toContain("Huella Hídrica Media");
    expect(html).not.toContain("Huella de Carbono");
  });

  it("renders Task Management Center with all tabs and lot records", () => {
    const html = renderToString(
      <AdminDashboard
        company={mockCompany}
        initialStats={mockStats}
        initialLots={mockLots}
      />
    );

    expect(html).toContain("Centro de Gestión de Tareas y Lotes");
    expect(html).toContain("En Disputa");
    expect(html).toContain("Fondeados");
    expect(html).toContain("Publicados");
    expect(html).toContain("Liquidados");
    expect(html).toContain("Todos los Lotes");

    // Default tab with disputes should render the disputed lot
    expect(html).toContain("LOT-DISP-001");
    expect(html).toContain("Disputa activa");
  });

  it("renders cleanly with empty lots and null stats without errors", () => {
    const html = renderToString(
      <AdminDashboard
        company={mockCompany}
        initialStats={null}
        initialLots={[]}
      />
    );

    expect(html).toContain("Comisiones del Protocolo");
    expect(html).toContain("Centro de Gestión de Tareas y Lotes");
    expect(html).toContain("No se encontraron lotes");
  });

  it("renders Origins Directory with catalogue entries and loading action", () => {
    const html = renderToString(
      <AdminDashboard
        company={mockCompany}
        initialStats={mockStats}
        initialLots={mockLots}
      />
    );

    expect(html).toContain("Salares y Orígenes del Catálogo");
    expect(html).toContain("Cargar Minera");
    expect(html).toContain("Capacidad Agregada");
    expect(html).toContain("Salar de Peña Blanca");
    expect(html).toContain("PBL");
  });

  it("renders fully in English when wrapped in AccountI18nProvider with en dictionary", () => {
    const html = renderToString(
      <AccountI18nProvider dict={en}>
        <AdminDashboard
          company={mockCompany}
          initialStats={mockStats}
          initialLots={mockLots}
        />
      </AccountI18nProvider>
    );

    // Hero KPIs in English
    expect(html).toContain("Protocol Fees");
    expect(html).toContain("Total Li₂CO₃ Volume");
    expect(html).toContain("In Escrow Custody");

    // Treasury in English
    expect(html).toContain("On-Chain Treasury");
    expect(html).toContain("Protocol Vault &amp; Parameters");

    // Task Center in English
    expect(html).toContain("Task &amp; Lot Management Center");
    expect(html).toContain("Disputed");
    expect(html).toContain("Funded");
    expect(html).toContain("Listed");
    expect(html).toContain("Settled");
    expect(html).toContain("All Lots");

    // Companies & Origins Directories in English
    expect(html).toContain("Protocol Companies Directory");
    expect(html).toContain("Load Buyer");
    expect(html).toContain("Salares &amp; Catalogue Origins");
    expect(html).toContain("Load Producer");
  });
});
