import Link from "next/link";
import { redirect } from "next/navigation";
import { SessionMenu } from "../components/session-menu";
import { ThemeToggle } from "../components/theme-toggle";
import { isCompanyType } from "../lib/company";
import { createClient } from "../lib/supabase/server";
import { AccountClient, type AcquiredLot } from "./account-client";
import { CompanyOnboardingForm } from "./company-onboarding-form";

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

  let acquiredLots: AcquiredLot[] = [];
  if (company?.companyType === "buyer" && company.walletAddress) {
    const { data: lots } = await supabase
      .from("lots")
      .select(
        "lot_id, pda_address, status, volume_tonnes, purity_pct, price_usdc, fund_tx_signature, redeem_tx_signature, origin_id, indexed_at"
      )
      .eq("buyer_wallet", company.walletAddress)
      .in("status", ["funded", "disputed", "redeemed", "claimed"])
      .order("indexed_at", { ascending: false });
    acquiredLots = (lots ?? []) as AcquiredLot[];
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
