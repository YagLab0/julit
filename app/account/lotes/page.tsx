import Link from "next/link";
import { EmptyState, WalletCard } from "../account-client";
import { getAccountContext } from "../account-data";
import { BuyerLotGrid } from "../designated-lots";
import { getAccountDict } from "../i18n/server";
import { LotGridCard } from "./lot-card";

const LOT_ICON = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className="size-9"
  >
    <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
    <path d="M3 8l9 5 9-5M12 13v8" />
  </svg>
);

export default async function LotesPage() {
  const [{ company, producerLots, designatedLots, lots }, dict] =
    await Promise.all([getAccountContext(), getAccountDict()]);

  // Layout renders the onboarding form when there is no company yet.
  if (!company) return null;

  if (company.companyType === "buyer") {
    const buyerLots = [...designatedLots, ...lots];
    const walletAddress = company.walletAddress;
    return (
      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">
              {dict.lotesPage.buyerEyebrow}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {buyerLots.length}{" "}
              {buyerLots.length === 1
                ? dict.lotesPage.buyerCountOne
                : dict.lotesPage.buyerCountMany}{" "}
              {dict.lotesPage.buyerCountSuffix}
            </p>
          </div>
          <Link
            href="/account/catalogo"
            className="rounded-full bg-foreground px-4 py-2.5 text-xs font-semibold text-background transition hover:opacity-90 active:scale-[0.97]"
          >
            {dict.lotesPage.buyerCatalog}
          </Link>
        </div>

        {!walletAddress ? (
          <WalletCard
            className="animate-bento-in mt-4"
            walletAddress={walletAddress}
            walletVerifiedAt={company.walletVerifiedAt}
          />
        ) : buyerLots.length === 0 ? (
          <div className="animate-bento-in mt-4 rounded-3xl bg-card">
            <EmptyState
              icon={LOT_ICON}
              title={dict.lotesPage.buyerEmptyTitle}
              body={dict.lotesPage.buyerEmptyBody}
            />
          </div>
        ) : (
          <BuyerLotGrid
            lots={buyerLots}
            buyable={designatedLots.filter((l) => l.status === "listed")}
            walletAddress={walletAddress}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">
            {dict.lotesPage.producerEyebrow}
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {producerLots.length}{" "}
            {producerLots.length === 1 ? dict.common.lot : dict.common.lots}{" "}
            {dict.lotesPage.producerCountSuffix}
          </p>
        </div>
        <Link
          href="/account/lotes/new"
          className="rounded-full bg-foreground px-4 py-2.5 text-xs font-semibold text-background transition hover:opacity-90 active:scale-[0.97]"
        >
          {dict.lotesPage.producerNew}
        </Link>
      </div>

      {!company.walletAddress ? (
        <WalletCard
          className="animate-bento-in mt-4"
          walletAddress={company.walletAddress}
          walletVerifiedAt={company.walletVerifiedAt}
        />
      ) : producerLots.length === 0 ? (
        <div className="animate-bento-in mt-4 rounded-3xl bg-card">
          <EmptyState
            icon={LOT_ICON}
            title={dict.lotesPage.producerEmptyTitle}
            body={dict.lotesPage.producerEmptyBody}
            action={
              <Link
                href="/account/lotes/new"
                className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:opacity-90"
              >
                {dict.lotesPage.producerEmptyAction}
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {producerLots.map((lot, i) => (
            <LotGridCard key={lot.pda_address} lot={lot} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
