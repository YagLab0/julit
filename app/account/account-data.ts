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

export type ProducerLot = {
  lot_id: string;
  pda_address: string;
  status: string;
  volume_tonnes: number;
  purity_pct: number;
  price_usdc: number;
  origin_id: string;
  buyer_wallet: string;
  indexed_at: string;
};

const DESIGNATED_STATUSES = ["listed", "funded", "disputed"] as const;
const HISTORY_STATUSES = ["redeemed", "claimed"] as const;

const LOT_COLUMNS =
  "lot_id, pda_address, status, volume_tonnes, purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne, price_usdc, producer_wallet, buyer_wallet, mint_address, claimable_after, origin_id, fund_tx_signature, redeem_tx_signature, dispute_tx_signature, claim_tx_signature, indexed_at";

type LotRow = Omit<DesignatedLot, "producer_name" | "status"> & {
  status: string;
};

export type AccountContext = {
  user: User | null;
  company: AccountCompany | null;
  designatedLots: DesignatedLot[];
  lots: AcquiredLot[];
  producerLots: ProducerLot[];
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
    };
  }

  const { data: companyRow } = await supabase
    .from("companies")
    .select(
      "name, company_type, wallet_address, wallet_verified_at, origin_id, purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne"
    )
    .eq("id", user.id)
    .maybeSingle();

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
        "lot_id, pda_address, status, volume_tonnes, purity_pct, price_usdc, origin_id, buyer_wallet, indexed_at"
      )
      .eq("producer_wallet", company.walletAddress)
      .order("indexed_at", { ascending: false });
    producerLots = (data ?? []) as ProducerLot[];
  }

  return { user, company, designatedLots, lots, producerLots };
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
