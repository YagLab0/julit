import { redirect } from "next/navigation";
import { BuyerOffersCard, WalletCard } from "../account-client";
import { getAccountContext, getCompanyContracts } from "../account-data";

export default async function OfertasPage() {
  const { user, company } = await getAccountContext();

  // Layout renders the onboarding form when there is no company yet.
  if (!company || !user) return null;

  if (company.companyType !== "producer") {
    redirect("/account");
  }

  const contracts = await getCompanyContracts(user.id);

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-6">
      {!company.walletAddress && (
        <WalletCard
          className="animate-bento-in sm:col-span-6"
          walletAddress={company.walletAddress}
          walletVerifiedAt={company.walletVerifiedAt}
        />
      )}
      <BuyerOffersCard
        className="animate-bento-in sm:col-span-6"
        contracts={contracts}
      />
    </div>
  );
}
