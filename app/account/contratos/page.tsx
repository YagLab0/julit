import { redirect } from "next/navigation";
import {
  BuyerContractsCard,
  ContractsCard,
  WalletCard,
} from "../account-client";
import {
  getAccountContext,
  getBuyerDirectory,
  getCompanyContracts,
} from "../account-data";

export default async function ContratosPage() {
  const { user, company } = await getAccountContext();

  // Layout renders the onboarding form when there is no company yet.
  if (!company || !user) return null;

  if (company.companyType === "admin") {
    redirect("/account");
  }

  const contracts = await getCompanyContracts(user.id);
  const directory =
    company.companyType === "producer" ? await getBuyerDirectory(user.id) : [];

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-6">
      {!company.walletAddress && (
        <WalletCard
          className="animate-bento-in sm:col-span-6"
          walletAddress={company.walletAddress}
          walletVerifiedAt={company.walletVerifiedAt}
        />
      )}
      {company.companyType === "buyer" ? (
        <BuyerContractsCard
          className="animate-bento-in sm:col-span-6"
          contracts={contracts}
        />
      ) : (
        <ContractsCard
          className="animate-bento-in sm:col-span-6"
          contracts={contracts}
          directory={directory}
        />
      )}
    </div>
  );
}
