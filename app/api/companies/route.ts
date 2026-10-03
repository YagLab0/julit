import { isCompanyType } from "../../lib/company";
import { jsonError, readJsonBody } from "../../lib/server/api";
import { createClient } from "../../lib/supabase/server";
import { createServiceClient } from "../../lib/supabase/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const originId = url.searchParams.get("origin_id");

  const service = createServiceClient();
  let query = service
    .from("companies")
    .select("id, name, company_type, origin_id, wallet_address, wallet_verified_at")
    .not("wallet_address", "is", null);

  if (type) {
    query = query.eq("company_type", type);
  }
  if (originId) {
    query = query.eq("origin_id", originId);
  }

  const { data: companies, error } = await query;
  if (error) {
    return jsonError("Error al obtener las empresas registradas.", 500);
  }

  return Response.json({ companies: companies ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Iniciá sesión para registrar tu empresa.", 401);
  }

  const body = await readJsonBody(request);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const companyType = body?.company_type;

  if (!name) {
    return jsonError("Ingresá el nombre de la empresa.", 400);
  }
  if (!isCompanyType(companyType)) {
    return jsonError("Elegí un tipo de empresa válido.", 400);
  }
  if (companyType === "producer") {
    return jsonError(
      "El registro de productores está cerrado: las cuentas productoras se provisionan.",
      400
    );
  }

  const service = createServiceClient();
  const { data: existing } = await service
    .from("companies")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    return jsonError("Esta cuenta ya tiene una empresa registrada.", 409);
  }

  const { data: company, error } = await service
    .from("companies")
    .insert({ id: user.id, name, company_type: companyType })
    .select("id, name, company_type, wallet_address, wallet_verified_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError("Esta cuenta ya tiene una empresa registrada.", 409);
    }
    return jsonError("No se pudo registrar la empresa. Intentá de nuevo.", 500);
  }

  return Response.json({ company }, { status: 201 });
}
