import { getProtocolStats } from "../../../account/account-data";
import { jsonError } from "../../../lib/server/api";
import { createClient } from "../../../lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Iniciá sesión para ver las estadísticas.", 401);
  }

  const { data: company } = await supabase
    .from("companies")
    .select("company_type")
    .eq("id", user.id)
    .maybeSingle();

  if (!company || company.company_type !== "admin") {
    return jsonError(
      "Solo los administradores pueden acceder a las estadísticas del protocolo.",
      403
    );
  }

  const stats = await getProtocolStats();

  return Response.json({ stats, ...stats });
}
