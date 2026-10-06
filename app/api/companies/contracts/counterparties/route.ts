import { jsonError } from "../../../../lib/server/api";
import { createClient } from "../../../../lib/supabase/server";
import { createServiceClient } from "../../../../lib/supabase/service";

/**
 * Returns the accepted buyers of the session's producer company, as
 * { name, wallet }[] — the data the lot registration dropdown consumes.
 * Only counterparties with a verified wallet can be designated on a lot.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError("Iniciá sesión para ver tus contrapartes.", 401);
  }

  const type = new URL(request.url).searchParams.get("type");
  if (type !== "buyer") {
    return jsonError("Tipo inválido: usá buyer.", 400);
  }

  const service = createServiceClient();
  const { data: contracts, error } = await service
    .from("company_contracts")
    .select("counterparty_id")
    .eq("producer_id", user.id)
    .eq("status", "accepted");

  if (error) {
    return jsonError("No se pudieron cargar las contrapartes.", 500);
  }

  const ids = (contracts ?? []).map((c) => c.counterparty_id);
  const { data: counterparties } = ids.length
    ? await service
        .from("companies")
        .select("id, name, wallet_address")
        .in("id", ids)
        .eq("company_type", type)
        .not("wallet_verified_at", "is", null)
    : { data: [] };

  return Response.json({
    counterparties: (counterparties ?? []).map((c) => ({
      name: c.name,
      wallet: c.wallet_address as string,
    })),
  });
}
