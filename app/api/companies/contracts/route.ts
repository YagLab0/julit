import {
  contractPosture,
  offerDirection,
  type ContractRole,
} from "../../../lib/company-contracts";
import type { CompanyType } from "../../../lib/company";
import { jsonError, readJsonBody } from "../../../lib/server/api";
import { createClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";

async function sessionCompany(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, company: null };

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, company_type")
    .eq("id", user.id)
    .maybeSingle();
  return { user, company };
}

/** Lists the contracts where the session's company is a party. */
export async function GET() {
  const supabase = await createClient();
  const { user, company } = await sessionCompany(supabase);
  if (!user) {
    return jsonError("Iniciá sesión para ver tus contratos.", 401);
  }
  if (!company) {
    return jsonError("Registrá tu empresa primero.", 400);
  }

  const service = createServiceClient();
  const { data: contracts, error } = await service
    .from("company_contracts")
    .select(
      "id, producer_id, counterparty_id, status, responded_at, created_at"
    )
    .or(`producer_id.eq.${company.id},counterparty_id.eq.${company.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError("No se pudieron cargar los contratos.", 500);
  }

  const companyIds = [
    ...new Set(
      (contracts ?? []).flatMap((c) => [c.producer_id, c.counterparty_id])
    ),
  ];
  const { data: parties } = companyIds.length
    ? await service
        .from("companies")
        .select("id, name, company_type")
        .in("id", companyIds)
    : { data: [] };
  const partyById = new Map((parties ?? []).map((p) => [p.id, p]));

  return Response.json({
    contracts: (contracts ?? []).map((c) => {
      const counterparty = partyById.get(c.counterparty_id) ?? null;
      const role: ContractRole =
        c.producer_id === company.id ? "producer" : "counterparty";
      const posture = counterparty
        ? contractPosture(role, counterparty.company_type as CompanyType)
        : null;
      return {
        id: c.id,
        status: c.status,
        respondedAt: c.responded_at,
        createdAt: c.created_at,
        producer: partyById.get(c.producer_id) ?? null,
        counterparty,
        role,
        posture,
      };
    }),
  });
}

/**
 * Creates a contract offer under the two sanctioned flows (ADR-0008):
 * a producer offering to an auditor, or a buyer offering to a producer.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, company } = await sessionCompany(supabase);
  if (!user) {
    return jsonError("Iniciá sesión para ofrecer contratos.", 401);
  }
  if (!company) {
    return jsonError("Registrá tu empresa primero.", 400);
  }

  const body = await readJsonBody(request);
  const targetId = body?.counterparty_id;
  if (typeof targetId !== "string" || !targetId) {
    return jsonError("Elegí una empresa contraparte.", 400);
  }
  if (targetId === company.id) {
    return jsonError("No podés contratarte a vos misma.", 400);
  }

  const service = createServiceClient();
  const { data: target } = await service
    .from("companies")
    .select("id, company_type")
    .eq("id", targetId)
    .maybeSingle();

  const offer = target
    ? offerDirection(
        company.company_type as CompanyType,
        target.company_type as CompanyType
      )
    : null;

  if (!offer) {
    return jsonError(
      "Solo una productora puede ofrecer a una auditora, o una compradora a una productora.",
      400
    );
  }

  const { data: contract, error } = await service
    .from("company_contracts")
    .insert({
      producer_id: offer.producerIsInitiator ? company.id : targetId,
      counterparty_id: offer.producerIsInitiator ? targetId : company.id,
    })
    .select("id, status, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError("Ya existe un contrato con esta empresa.", 409);
    }
    return jsonError("No se pudo crear el contrato. Intentá de nuevo.", 500);
  }

  return Response.json({ contract }, { status: 201 });
}
