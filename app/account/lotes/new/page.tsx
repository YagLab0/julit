import { GateCard } from "../../../components/gate-card";
import { originName } from "../../../lib/origins";
import { getAccountContext } from "../../account-data";
import { NewLotClient } from "./new-lot-client";

export default async function RegistrarLotePage() {
  const { company } = await getAccountContext();

  // Layout renders the onboarding form when there is no company yet.
  if (!company) return null;

  const specsComplete =
    company.purityPct != null &&
    company.waterM3PerTonne != null &&
    company.carbonKgCo2ePerTonne != null;

  return (
    <div className="animate-bento-in mt-6 max-w-3xl">
      <p className="text-sm leading-relaxed text-muted">
        Dá de alta un lote de carbonato de litio grado batería en Solana Devnet,
        con comprador designado y certificado de planta. La wallet verificada de
        tu empresa firma como productora.
      </p>

      {company.companyType !== "producer" ? (
        <GateCard body="El alta de lotes es exclusiva de empresas productoras." />
      ) : !company.walletVerifiedAt ? (
        <GateCard body="Vinculá la wallet verificada de tu empresa para poder firmar lotes." />
      ) : !company.originId ? (
        <GateCard body="El origen de producción de tu empresa se provisiona desde el servidor. Contactá al operador de la demo." />
      ) : !specsComplete ? (
        <GateCard body="Las especificaciones de producción de tu empresa se provisionan desde el servidor. Contactá al operador de la demo." />
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
