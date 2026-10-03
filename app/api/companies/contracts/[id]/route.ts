import { contractDirection } from "../../../../lib/company-contracts";
import type { CompanyType } from "../../../../lib/company";
import { jsonError, readJsonBody } from "../../../../lib/server/api";
import { createClient } from "../../../../lib/supabase/server";
import { createServiceClient } from "../../../../lib/supabase/service";

/**
 * The contract responder accepts or declines a pending offer:
 * { action: "accept" } → accepted, { action: "decline" } → revoked.
 * The responder is the counterparty for producer→auditor offers and the
 * producer for buyer→producer offers (ADR-0008).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError("Iniciá sesión para responder contratos.", 401);
  }

  const { id } = await params;
  const body = await readJsonBody(request);
  const action = body?.action;
  if (action !== "accept" && action !== "decline") {
    return jsonError("Acción inválida: usá accept o decline.", 400);
  }

  const service = createServiceClient();
  const { data: contract } = await service
    .from("company_contracts")
    .select("id, producer_id, counterparty_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!contract) {
    return jsonError("Contrato no encontrado.", 404);
  }

  const callerRole =
    contract.producer_id === user.id
      ? ("producer" as const)
      : contract.counterparty_id === user.id
        ? ("counterparty" as const)
        : null;
  if (!callerRole) {
    return jsonError("Este contrato no involucra a tu empresa.", 403);
  }

  const { data: counterparty } = await service
    .from("companies")
    .select("company_type")
    .eq("id", contract.counterparty_id)
    .single();

  const direction = counterparty
    ? contractDirection(counterparty.company_type as CompanyType)
    : null;
  if (direction?.responder !== callerRole) {
    return jsonError(
      "Solo la empresa que recibe la oferta puede responderla.",
      403
    );
  }
  if (contract.status !== "pending") {
    return jsonError("Este contrato ya fue respondido.", 409);
  }

  const { data: updated, error } = await service
    .from("company_contracts")
    .update({
      status: action === "accept" ? "accepted" : "revoked",
      responded_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id, status, responded_at")
    .single();

  if (error) {
    return jsonError("No se pudo responder el contrato.", 500);
  }

  return Response.json({ contract: updated });
}
