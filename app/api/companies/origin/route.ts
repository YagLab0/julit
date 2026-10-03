import { jsonError, readJsonBody } from "../../../lib/server/api";
import { createClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";

// One-time origin binding for a producer company that completed onboarding
// before origin assignment existed. Fixed once set (enforce_company_origin).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Iniciá sesión para configurar tu empresa.", 401);
  }

  const body = await readJsonBody(request);
  const originId = body?.origin_id;

  const service = createServiceClient();
  const { data: origins } = await service.from("origins").select("id");
  if (
    typeof originId !== "string" ||
    !origins?.some((origin) => origin.id === originId)
  ) {
    return jsonError("Elegí un origen de producción válido.", 400);
  }

  const { data: company } = await service
    .from("companies")
    .select("company_type, origin_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!company) {
    return jsonError("Registrá tu empresa primero.", 404);
  }
  if (company.company_type !== "producer") {
    return jsonError("Solo las productoras tienen origen.", 400);
  }
  if (company.origin_id != null) {
    return jsonError("El origen de tu empresa ya está asignado.", 409);
  }

  const { error } = await service
    .from("companies")
    .update({ origin_id: originId })
    .eq("id", user.id);

  if (error) {
    return jsonError("No se pudo asignar el origen. Intentá de nuevo.", 500);
  }

  return Response.json({ origin_id: originId });
}
