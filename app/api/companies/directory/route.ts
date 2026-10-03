import { jsonError } from "../../../lib/server/api";
import { createClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";

/**
 * Public-by-authentication directory of companies by type — { id, name }.
 * Used by producers to pick a counterparty when offering a contract. The
 * companies table is never browser-readable (ADR-0003); this endpoint is
 * the only read path and exposes no wallet data.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError("Iniciá sesión para ver el directorio.", 401);
  }

  const type = new URL(request.url).searchParams.get("type");
  if (type !== "producer" && type !== "auditor" && type !== "buyer") {
    return jsonError("Tipo inválido: usá producer, auditor o buyer.", 400);
  }

  const service = createServiceClient();
  const { data: companies, error } = await service
    .from("companies")
    .select("id, name")
    .eq("company_type", type)
    .order("name");

  if (error) {
    return jsonError("No se pudo cargar el directorio.", 500);
  }

  return Response.json({
    companies: (companies ?? []).filter((c) => c.id !== user.id),
  });
}
