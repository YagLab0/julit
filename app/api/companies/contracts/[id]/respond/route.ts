import { jsonError, readJsonBody } from "../../../../../lib/server/api";
import { createClient } from "../../../../../lib/supabase/server";
import { createServiceClient } from "../../../../../lib/supabase/service";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Iniciá sesión para responder ofertas de contrato.", 401);
  }

  const { id } = await params;
  const body = await readJsonBody(request);
  const status = body?.status;

  if (
    !UUID_PATTERN.test(id) ||
    (status !== "accepted" && status !== "revoked")
  ) {
    return jsonError("El pedido de respuesta no es válido.", 400);
  }

  const service = createServiceClient();
  const { data: contract } = await service
    .from("company_contracts")
    .select("id, counterparty_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!contract || contract.counterparty_id !== user.id) {
    return jsonError("Oferta de contrato no encontrada.", 404);
  }
  if (contract.status !== "pending") {
    return jsonError("Esta oferta ya fue respondida.", 409);
  }

  const { data, error } = await service
    .from("company_contracts")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id, status, responded_at")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return jsonError("Esta oferta ya fue respondida.", 409);
    }
    return jsonError("No se pudo responder la oferta. Intentá de nuevo.", 500);
  }

  return Response.json({ contract: data });
}
