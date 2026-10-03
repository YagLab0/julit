import { isCompanyType } from "../../lib/company";
import { jsonError, readJsonBody } from "../../lib/server/api";
import { createClient } from "../../lib/supabase/server";
import { createServiceClient } from "../../lib/supabase/service";

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
  const originId = body?.origin_id;

  if (!name) {
    return jsonError("Ingresá el nombre de la empresa.", 400);
  }
  if (!isCompanyType(companyType)) {
    return jsonError("Elegí un tipo de empresa válido.", 400);
  }
  if (companyType !== "producer" && originId != null) {
    return jsonError("Solo las productoras tienen origen.", 400);
  }

  const service = createServiceClient();
  const { data: origins } = await service.from("origins").select("id");
  const validOrigin =
    typeof originId === "string" &&
    origins?.some((origin) => origin.id === originId);

  if (companyType === "producer" && !validOrigin) {
    return jsonError("Elegí un origen de producción válido.", 400);
  }
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
    .insert({
      id: user.id,
      name,
      company_type: companyType,
      origin_id: companyType === "producer" ? (originId as string) : null,
    })
    .select(
      "id, name, company_type, wallet_address, wallet_verified_at, origin_id"
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError("Esta cuenta ya tiene una empresa registrada.", 409);
    }
    return jsonError("No se pudo registrar la empresa. Intentá de nuevo.", 500);
  }

  return Response.json({ company }, { status: 201 });
}
