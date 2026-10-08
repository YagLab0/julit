import { GateCard } from "../../../components/gate-card";
import { originName } from "../../../lib/origins";
import { getAccountContext } from "../../account-data";
import { getAccountDict } from "../../i18n/server";
import { NewLotClient } from "./new-lot-client";

export default async function RegistrarLotePage() {
  const [{ company }, dict] = await Promise.all([
    getAccountContext(),
    getAccountDict(),
  ]);

  // Layout renders the onboarding form when there is no company yet.
  if (!company) return null;

  const specsComplete =
    company.purityPct != null &&
    company.waterM3PerTonne != null &&
    company.carbonKgCo2ePerTonne != null;

  return (
    <div className="animate-bento-in mt-6 max-w-3xl">
      <p className="text-sm leading-relaxed text-muted">{dict.newLot.intro}</p>

      {company.companyType !== "producer" ? (
        <GateCard
          body={dict.newLot.gates.producerOnly}
          linkLabel={dict.common.accountLink}
        />
      ) : !company.walletVerifiedAt ? (
        <GateCard
          body={dict.newLot.gates.wallet}
          linkLabel={dict.common.accountLink}
        />
      ) : !company.originId ? (
        <GateCard
          body={dict.newLot.gates.origin}
          linkLabel={dict.common.accountLink}
        />
      ) : !specsComplete ? (
        <GateCard
          body={dict.newLot.gates.specs}
          linkLabel={dict.common.accountLink}
        />
      ) : (
        <NewLotClient
          producer={{
            name: company.name,
            walletAddress: company.walletAddress!,
            originId: company.originId,
            originName: originName(company.originId) ?? company.originId,
            specs: {
              purityPct: Number(company.purityPct).toFixed(2),
              waterM3PerTonne: Number(company.waterM3PerTonne).toFixed(2),
              carbonKgCo2ePerTonne: Number(
                company.carbonKgCo2ePerTonne
              ).toFixed(2),
            },
          }}
        />
      )}
    </div>
  );
}
