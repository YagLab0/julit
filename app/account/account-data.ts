import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { isCompanyType, type CompanyType } from "../lib/company";
import {
  contractPosture,
  type ContractPosture,
  type ContractRole,
} from "../lib/company-contracts";
import { createClient } from "../lib/supabase/server";
import { createServiceClient } from "../lib/supabase/service";
import type {
  AccountCompany,
  AcquiredLot,
  DesignatedLot,
} from "./account-client";
import { ORIGIN_COLUMNS, type Origin } from "../explorer/data/origins";
import { calculateLotFee } from "./lot-actions";

export type ProducerLot = {
  lot_id: string;
  pda_address: string;
  status: string;
  volume_tonnes: number;
  purity_pct: number;
  price_usdc: number;
  origin_id: string;
  buyer_wallet: string;
  mint_address: string | null;
  ship_by: string;
  confirm_window_secs: number;
  fee_bps: number | null;
  shipped_at: string | null;
  bl_hash: string | null;
  indexed_at: string;
};

const DESIGNATED_STATUSES = ["listed", "funded", "shipped"] as const;
const HISTORY_STATUSES = ["redeemed", "claimed", "refunded"] as const;

const LOT_COLUMNS =
  "lot_id, pda_address, status, volume_tonnes, purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne, price_usdc, producer_wallet, buyer_wallet, mint_address, origin_id, ship_by, confirm_window_secs, fee_bps, shipped_at, bl_hash, fund_tx_signature, redeem_tx_signature, ship_tx_signature, refund_tx_signature, claim_tx_signature, indexed_at";

type LotRow = Omit<DesignatedLot, "producer_name" | "status"> & {
  status: string;
};

export type AdminLot = {
  lot_id: string;
  pda_address: string;
  status: string;
  volume_tonnes: number;
  purity_pct: number;
  water_footprint_m3_per_tonne: number | null;
  carbon_footprint_kg_co2e_per_tonne: number | null;
  price_usdc: number;
  producer_wallet: string;
  buyer_wallet: string;
  mint_address: string | null;
  origin_id: string;
  ship_by: string | null;
  confirm_window_secs: number | null;
  fee_bps: number | null;
  shipped_at: string | null;
  bl_hash: string | null;
  fund_tx_signature: string | null;
  redeem_tx_signature: string | null;
  ship_tx_signature: string | null;
  refund_tx_signature: string | null;
  claim_tx_signature: string | null;
  indexed_at: string;
  producer_name?: string | null;
  buyer_name?: string | null;
};

export type AdminCompany = {
  id: string;
  name: string;
  company_type: CompanyType;
  wallet_address: string | null;
  wallet_verified_at: string | null;
  origin_id: string | null;
  purity_pct: number | null;
  water_footprint_m3_per_tonne: number | null;
  carbon_footprint_kg_co2e_per_tonne: number | null;
  created_at: string;
  email?: string | null;
};

export type AccountContext = {
  user: User | null;
  company: AccountCompany | null;
  designatedLots: DesignatedLot[];
  lots: AcquiredLot[];
  producerLots: ProducerLot[];
  adminStats?: AdminStats | null;
  adminLots?: AdminLot[];
  adminCompanies?: AdminCompany[];
  adminOrigins?: Origin[];
};

export const getAccountContext = cache(async (): Promise<AccountContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      company: null,
      designatedLots: [],
      lots: [],
      producerLots: [],
      adminStats: null,
    };
  }

  const service = createServiceClient();
  let { data: companyRow } = await service
    .from("companies")
    .select(
      "name, company_type, wallet_address, wallet_verified_at, origin_id, purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne"
    )
    .eq("id", user.id)
    .maybeSingle();

  const isAdminUser =
    user.email?.toLowerCase().includes("admin") ||
    user.app_metadata?.role === "admin";

  // Only auto-provision for admin accounts; regular accounts must go through onboarding if not registered
  if (!companyRow && isAdminUser) {
    const adminCompany = {
      id: user.id,
      name: "JuLit Protocol Admin",
      company_type: "admin" as const,
    };

    const { data: inserted } = await service
      .from("companies")
      .upsert(adminCompany)
      .select(
        "name, company_type, wallet_address, wallet_verified_at, origin_id, purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne"
      )
      .maybeSingle();

    companyRow = inserted ?? {
      ...adminCompany,
      wallet_address: null,
      wallet_verified_at: null,
      origin_id: null,
      purity_pct: null,
      water_footprint_m3_per_tonne: null,
      carbon_footprint_kg_co2e_per_tonne: null,
    };
  }

  const company =
    companyRow && isCompanyType(companyRow.company_type)
      ? {
          name: companyRow.name,
          companyType: companyRow.company_type,
          walletAddress: companyRow.wallet_address,
          walletVerifiedAt: companyRow.wallet_verified_at,
          originId: companyRow.origin_id,
          purityPct: companyRow.purity_pct,
          waterM3PerTonne: companyRow.water_footprint_m3_per_tonne,
          carbonKgCo2ePerTonne: companyRow.carbon_footprint_kg_co2e_per_tonne,
        }
      : isAdminUser
        ? {
            name: "JuLit Protocol Admin",
            companyType: "admin" as CompanyType,
            walletAddress: null,
            walletVerifiedAt: null,
            originId: null,
            purityPct: null,
            waterM3PerTonne: null,
            carbonKgCo2ePerTonne: null,
          }
        : null;

  const designatedLots: DesignatedLot[] = [];
  const lots: AcquiredLot[] = [];
  if (company?.companyType === "buyer" && company.walletAddress) {
    const { data } = await supabase
      .from("lots")
      .select(LOT_COLUMNS)
      .eq("buyer_wallet", company.walletAddress)
      .in("status", [...DESIGNATED_STATUSES, ...HISTORY_STATUSES])
      .order("indexed_at", { ascending: false });

    const rows = (data ?? []) as LotRow[];

    // Producer names live behind companies_read_own RLS — resolve them
    // server-side like the directory endpoint does.
    const wallets = [...new Set(rows.map((l) => l.producer_wallet))];
    const nameByWallet = new Map<string, string>();
    if (wallets.length > 0) {
      const service = createServiceClient();
      const { data: producers } = await service
        .from("companies")
        .select("wallet_address, name")
        .in("wallet_address", wallets);
      for (const p of producers ?? []) {
        if (p.wallet_address) nameByWallet.set(p.wallet_address, p.name);
      }
    }

    for (const row of rows) {
      const withProducer = {
        ...row,
        producer_name: nameByWallet.get(row.producer_wallet) ?? null,
      };
      if ((DESIGNATED_STATUSES as readonly string[]).includes(row.status)) {
        designatedLots.push(withProducer as DesignatedLot);
      } else {
        lots.push(withProducer as AcquiredLot);
      }
    }
  }

  let producerLots: ProducerLot[] = [];
  if (company?.companyType === "producer" && company.walletAddress) {
    const { data } = await supabase
      .from("lots")
      .select(
        "lot_id, pda_address, status, volume_tonnes, purity_pct, price_usdc, origin_id, buyer_wallet, mint_address, ship_by, confirm_window_secs, fee_bps, shipped_at, bl_hash, indexed_at"
      )
      .eq("producer_wallet", company.walletAddress)
      .order("indexed_at", { ascending: false });
    producerLots = (data ?? []) as ProducerLot[];
  }

  let adminStats: AdminStats | null = null;
  let adminLots: AdminLot[] = [];
  let adminCompanies: AdminCompany[] = [];
  let adminOrigins: Origin[] = [];
  if (company?.companyType === "admin") {
    try {
      adminStats = await getProtocolStats();
    } catch {
      adminStats = null;
    }

    try {
      const service = createServiceClient();
      const { data: rawLots } = await service
        .from("lots")
        .select(LOT_COLUMNS)
        .order("indexed_at", { ascending: false });

      const rows = (rawLots ?? []) as unknown as AdminLot[];
      const wallets = [
        ...new Set(
          rows
            .flatMap((l) => [l.producer_wallet, l.buyer_wallet])
            .filter((w): w is string => Boolean(w))
        ),
      ];

      const nameByWallet = new Map<string, string>();
      if (wallets.length > 0) {
        const { data: companies } = await service
          .from("companies")
          .select("wallet_address, name")
          .in("wallet_address", wallets);
        for (const c of companies ?? []) {
          if (c.wallet_address) nameByWallet.set(c.wallet_address, c.name);
        }
      }

      adminLots = rows.map((r) => ({
        ...r,
        producer_name: nameByWallet.get(r.producer_wallet) ?? null,
        buyer_name: nameByWallet.get(r.buyer_wallet) ?? null,
      }));
    } catch {
      adminLots = [];
    }

    try {
      const service = createServiceClient();
      const { data: allCompanies } = await service
        .from("companies")
        .select(
          "id, name, company_type, wallet_address, wallet_verified_at, origin_id, purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne, created_at"
        )
        .order("created_at", { ascending: false });

      const { data: usersData } = await service.auth.admin.listUsers();
      const emailById = new Map<string, string>();
      for (const u of usersData?.users ?? []) {
        if (u.email) emailById.set(u.id, u.email);
      }

      adminCompanies = (allCompanies ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        company_type: c.company_type as CompanyType,
        wallet_address: c.wallet_address,
        wallet_verified_at: c.wallet_verified_at,
        origin_id: c.origin_id,
        purity_pct: c.purity_pct ? Number(c.purity_pct) : null,
        water_footprint_m3_per_tonne: c.water_footprint_m3_per_tonne
          ? Number(c.water_footprint_m3_per_tonne)
          : null,
        carbon_footprint_kg_co2e_per_tonne: c.carbon_footprint_kg_co2e_per_tonne
          ? Number(c.carbon_footprint_kg_co2e_per_tonne)
          : null,
        created_at: c.created_at,
        email: emailById.get(c.id) ?? null,
      }));
    } catch {
      adminCompanies = [];
    }

    try {
      const service = createServiceClient();
      const { data: allOrigins } = await service
        .from("origins")
        .select(ORIGIN_COLUMNS)
        .order("name", { ascending: true });
      adminOrigins = (allOrigins ?? []) as Origin[];
    } catch {
      adminOrigins = [];
    }
  }

  return {
    user,
    company,
    designatedLots,
    lots,
    producerLots,
    adminStats,
    adminLots,
    adminCompanies,
    adminOrigins,
  };
});

export type ContractParty = {
  id: string;
  name: string;
  company_type: CompanyType | null;
  wallet_address: string | null;
  origin_id: string | null;
};

export type AccountContract = {
  id: string;
  status: "pending" | "accepted" | "revoked";
  initiator_signature: string | null;
  counterparty_signature: string | null;
  producer: ContractParty | null;
  counterparty: ContractParty | null;
  role: ContractRole;
  posture: ContractPosture;
};

type ContractDbRow = {
  id: string;
  producer_id: string;
  counterparty_id: string;
  initiator_id: string;
  status: "pending" | "accepted" | "revoked";
  initiator_signature: string | null;
  counterparty_signature: string | null;
};

/** Contracts where the company is a party — same shape the retired
 *  GET /api/companies/contracts returned. Uses the service client because the
 *  companies table is never browser-readable (ADR-0003). */
export const getCompanyContracts = cache(
  async (companyId: string): Promise<AccountContract[]> => {
    const service = createServiceClient();
    const { data: contracts } = await service
      .from("company_contracts")
      .select(
        "id, producer_id, counterparty_id, initiator_id, status, initiator_signature, counterparty_signature"
      )
      .or(`producer_id.eq.${companyId},counterparty_id.eq.${companyId}`)
      .order("created_at", { ascending: false });

    const rows = (contracts ?? []) as ContractDbRow[];
    const partyIds = [
      ...new Set(rows.flatMap((c) => [c.producer_id, c.counterparty_id])),
    ];
    const { data: parties } = partyIds.length
      ? await service
          .from("companies")
          .select("id, name, company_type, wallet_address, origin_id")
          .in("id", partyIds)
      : { data: [] };

    const partyById = new Map(
      (parties ?? []).map((p) => [
        p.id,
        {
          id: p.id as string,
          name: p.name as string,
          company_type: isCompanyType(p.company_type) ? p.company_type : null,
          wallet_address: p.wallet_address as string | null,
          origin_id: p.origin_id as string | null,
        } satisfies ContractParty,
      ])
    );

    return rows.map((c) => ({
      id: c.id,
      status: c.status,
      initiator_signature: c.initiator_signature,
      counterparty_signature: c.counterparty_signature,
      producer: partyById.get(c.producer_id) ?? null,
      counterparty: partyById.get(c.counterparty_id) ?? null,
      role: (c.producer_id === companyId
        ? "producer"
        : "counterparty") as ContractRole,
      posture: contractPosture(companyId, c.initiator_id),
    }));
  }
);

/** Buyer companies a producer can offer contracts to ({ id, name }). */
export const getBuyerDirectory = cache(
  async (excludeCompanyId: string): Promise<{ id: string; name: string }[]> => {
    const service = createServiceClient();
    const { data } = await service
      .from("companies")
      .select("id, name")
      .eq("company_type", "buyer")
      .order("name");

    return (data ?? []).filter(
      (c) => (c.id as string) !== excludeCompanyId
    ) as { id: string; name: string }[];
  }
);

export type ProtocolStats = {
  companies: {
    total: number;
    producers: number;
    buyers: number;
    admins: number;
    verifiedWallets: number;
  };
  contracts: {
    total: number;
    pending: number;
    accepted: number;
    revoked: number;
  };
  lots: {
    total: number;
    byStatus: {
      listed: number;
      funded: number;
      redeemed: number;
      cancelled: number;
      shipped: number;
      refunded: number;
      claimed: number;
    };
    totalVolumeTonnes: number;
    settledVolumeTonnes: number;
    listedVolumeTonnes: number;
    fundedVolumeTonnes: number;
    totalValueUsdc: number;
    settledValueUsdc: number;
    escrowedValueUsdc: number;
    estimatedProtocolFeesUsdc: number;
  };
};

export type AdminStats = ProtocolStats;

export type RawCompanyStat = {
  company_type: string;
  wallet_address?: string | null;
  wallet_verified_at?: string | null;
};

export type RawContractStat = {
  status: string;
};

export type RawLotStat = {
  status: string;
  volume_tonnes: number | string | null;
  price_usdc: number | string | null;
  fee_bps?: number | null;
};

export function calculateProtocolStats(data: {
  companies: RawCompanyStat[];
  contracts: RawContractStat[];
  lots: RawLotStat[];
}): ProtocolStats {
  const companies = data.companies ?? [];
  const contracts = data.contracts ?? [];
  const lots = data.lots ?? [];

  const companyStats = {
    total: companies.length,
    producers: companies.filter((c) => c.company_type === "producer").length,
    buyers: companies.filter((c) => c.company_type === "buyer").length,
    admins: companies.filter((c) => c.company_type === "admin").length,
    verifiedWallets: companies.filter((c) => Boolean(c.wallet_address)).length,
  };

  const contractStats = {
    total: contracts.length,
    pending: contracts.filter((c) => c.status === "pending").length,
    accepted: contracts.filter((c) => c.status === "accepted").length,
    revoked: contracts.filter((c) => c.status === "revoked").length,
  };

  const byStatus = {
    listed: lots.filter((l) => l.status === "listed").length,
    funded: lots.filter((l) => l.status === "funded").length,
    redeemed: lots.filter((l) => l.status === "redeemed").length,
    cancelled: lots.filter((l) => l.status === "cancelled").length,
    shipped: lots.filter((l) => l.status === "shipped").length,
    refunded: lots.filter((l) => l.status === "refunded").length,
    claimed: lots.filter((l) => l.status === "claimed").length,
  };

  let totalVolumeTonnes = 0;
  let settledVolumeTonnes = 0;
  let listedVolumeTonnes = 0;
  let fundedVolumeTonnes = 0;

  let totalValueUsdc = 0;
  let settledValueUsdc = 0;
  let escrowedValueUsdc = 0;
  let protocolFeesUsdc = 0;

  for (const lot of lots) {
    const vol = Number(lot.volume_tonnes || 0);
    const val = Number(lot.price_usdc || 0);

    totalVolumeTonnes += vol;
    totalValueUsdc += val;

    if (lot.status === "redeemed" || lot.status === "claimed") {
      settledVolumeTonnes += vol;
      settledValueUsdc += val;
      protocolFeesUsdc += calculateLotFee(val, lot.fee_bps ?? 100);
    } else if (lot.status === "listed") {
      listedVolumeTonnes += vol;
    } else if (lot.status === "funded" || lot.status === "shipped") {
      fundedVolumeTonnes += vol;
      escrowedValueUsdc += val;
    }
  }

  const estimatedProtocolFeesUsdc =
    Math.round(protocolFeesUsdc * 1_000_000) / 1_000_000;

  return {
    companies: companyStats,
    contracts: contractStats,
    lots: {
      total: lots.length,
      byStatus,
      totalVolumeTonnes: Math.round(totalVolumeTonnes * 100) / 100,
      settledVolumeTonnes: Math.round(settledVolumeTonnes * 100) / 100,
      listedVolumeTonnes: Math.round(listedVolumeTonnes * 100) / 100,
      fundedVolumeTonnes: Math.round(fundedVolumeTonnes * 100) / 100,
      totalValueUsdc: Math.round(totalValueUsdc * 1000000) / 1000000,
      settledValueUsdc: Math.round(settledValueUsdc * 1000000) / 1000000,
      escrowedValueUsdc: Math.round(escrowedValueUsdc * 1000000) / 1000000,
      estimatedProtocolFeesUsdc,
    },
  };
}

export const getProtocolStats = cache(
  async (
    client?: ReturnType<typeof createServiceClient>
  ): Promise<ProtocolStats> => {
    const service = client ?? createServiceClient();
    const [companiesRes, contractsRes, lotsRes] = await Promise.all([
      service
        .from("companies")
        .select("company_type, wallet_address, wallet_verified_at"),
      service.from("company_contracts").select("status"),
      service.from("lots").select("status, volume_tonnes, price_usdc, fee_bps"),
    ]);

    return calculateProtocolStats({
      companies: (companiesRes.data ?? []) as RawCompanyStat[],
      contracts: (contractsRes.data ?? []) as RawContractStat[],
      lots: (lotsRes.data ?? []) as RawLotStat[],
    });
  }
);

export const getAdminStats = getProtocolStats;
