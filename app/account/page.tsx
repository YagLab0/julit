import Link from "next/link";
import { redirect } from "next/navigation";
import { SessionMenu } from "../components/session-menu";
import { ThemeToggle } from "../components/theme-toggle";
import { isCompanyType } from "../lib/company";
import { createClient } from "../lib/supabase/server";
import { createServiceClient } from "../lib/supabase/service";
import {
  AccountClient,
  type AcquiredLot,
  type DesignatedLot,
} from "./account-client";
import { CompanyOnboardingForm } from "./company-onboarding-form";

const DESIGNATED_STATUSES = ["listed", "funded", "disputed"] as const;
const HISTORY_STATUSES = ["redeemed", "claimed"] as const;

const LOT_COLUMNS =
  "lot_id, pda_address, status, volume_tonnes, purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne, price_usdc, producer_wallet, buyer_wallet, mint_address, claimable_after, origin_id, fund_tx_signature, redeem_tx_signature, dispute_tx_signature, claim_tx_signature, indexed_at";

type LotRow = Omit<DesignatedLot, "producer_name" | "status"> & {
  status: string;
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: companyRow } = await supabase
    .from("companies")
    .select("name, company_type, wallet_address, wallet_verified_at, origin_id")
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
        }
      : null;

  const designatedLots: DesignatedLot[] = [];
  const acquiredLots: AcquiredLot[] = [];
  if (company?.companyType === "buyer" && company.walletAddress) {
    const { data: lots } = await supabase
      .from("lots")
      .select(LOT_COLUMNS)
      .eq("buyer_wallet", company.walletAddress)
      .in("status", [...DESIGNATED_STATUSES, ...HISTORY_STATUSES])
      .order("indexed_at", { ascending: false });

    const rows = (lots ?? []) as LotRow[];

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
        acquiredLots.push(withProducer as AcquiredLot);
      }
    }
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link
          href="/"
          className="text-sm font-bold tracking-tight text-foreground"
        >
          JuLit
        </Link>
        <div className="flex items-center gap-3">
          <SessionMenu />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-16">
        {company ? (
          <AccountClient
            email={user.email ?? ""}
            company={company}
            designatedLots={designatedLots}
            acquiredLots={acquiredLots}
          />
        ) : (
          <div className="mx-auto mt-10 max-w-md">
            <CompanyOnboardingForm />
          </div>
        )}
      </main>
    </div>
  );
}
