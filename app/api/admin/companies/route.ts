import { isCompanyType, type CompanyType } from "../../../lib/company";
import { jsonError, readJsonBody } from "../../../lib/server/api";
import { createClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";
import { ORIGINS } from "../../../lib/origins";

const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

async function assertAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, error: jsonError("Iniciá sesión como administrador.", 401) };
  }

  const isAdminEmail = user.email?.toLowerCase().includes("admin");
  const isAdminRole = user.app_metadata?.role === "admin";

  const service = createServiceClient();
  const { data: comp } = await service
    .from("companies")
    .select("company_type")
    .eq("id", user.id)
    .maybeSingle();

  if (!isAdminEmail && !isAdminRole && comp?.company_type !== "admin") {
    return {
      user: null,
      error: jsonError("Acceso denegado: se requieren privilegios de administrador.", 403),
    };
  }

  return { user, error: null };
}

export async function GET() {
  const { error } = await assertAdminUser();
  if (error) return error;

  const service = createServiceClient();
  const { data: companies, error: dbError } = await service
    .from("companies")
    .select(
      "id, name, company_type, wallet_address, wallet_verified_at, origin_id, purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne, created_at"
    )
    .order("created_at", { ascending: false });

  if (dbError) {
    return jsonError("Error al consultar las empresas del protocolo.", 500);
  }

  const { data: usersData } = await service.auth.admin.listUsers();
  const emailById = new Map<string, string>();
  for (const u of usersData?.users ?? []) {
    if (u.email) emailById.set(u.id, u.email);
  }

  const result = (companies ?? []).map((c) => ({
    ...c,
    email: emailById.get(c.id) ?? null,
  }));

  return Response.json({ companies: result });
}

export async function POST(request: Request) {
  const { error: authErr } = await assertAdminUser();
  if (authErr) return authErr;

  const body = await readJsonBody(request);
  if (!body) {
    return jsonError("Cuerpo de solicitud inválido.", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const companyType = body.company_type as CompanyType;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" && body.password.length >= 6
    ? body.password
    : "julit-demo-2026";
  const originId = typeof body.origin_id === "string" ? body.origin_id.trim() : null;
  const rawWallet = typeof body.wallet_address === "string" ? body.wallet_address.trim() : "";

  if (!name) {
    return jsonError("El nombre de la empresa es obligatorio.", 400);
  }
  if (!isCompanyType(companyType)) {
    return jsonError("El tipo de empresa es inválido.", 400);
  }
  if (!email || !email.includes("@")) {
    return jsonError("Ingresá un correo electrónico válido.", 400);
  }

  if (rawWallet && !SOLANA_ADDRESS_REGEX.test(rawWallet)) {
    return jsonError("La dirección de wallet Solana ingresada no es válida.", 400);
  }

  if (companyType === "producer") {
    if (!originId || !ORIGINS.some((o) => o.id === originId)) {
      return jsonError("Seleccioná un origen o salar válido del catálogo para el productor.", 400);
    }
  }

  // Production specs validation (must be either all present or all null per ADR-0020)
  const hasPurity = body.purity_pct !== undefined && body.purity_pct !== null && body.purity_pct !== "";
  const hasWater = body.water_footprint_m3_per_tonne !== undefined && body.water_footprint_m3_per_tonne !== null && body.water_footprint_m3_per_tonne !== "";
  const hasCarbon = body.carbon_footprint_kg_co2e_per_tonne !== undefined && body.carbon_footprint_kg_co2e_per_tonne !== null && body.carbon_footprint_kg_co2e_per_tonne !== "";

  let purityPct: number | null = null;
  let waterFootprint: number | null = null;
  let carbonFootprint: number | null = null;

  if (companyType === "producer" && (hasPurity || hasWater || hasCarbon)) {
    if (!(hasPurity && hasWater && hasCarbon)) {
      return jsonError(
        "Las especificaciones de producción (pureza Li₂CO₃, huella hídrica y huella de carbono) deben enviarse juntas.",
        400
      );
    }

    purityPct = Number(body.purity_pct);
    waterFootprint = Number(body.water_footprint_m3_per_tonne);
    carbonFootprint = Number(body.carbon_footprint_kg_co2e_per_tonne);

    if (isNaN(purityPct) || purityPct < 99.5 || purityPct > 100) {
      return jsonError("La pureza Li₂CO₃ debe estar entre 99.50% y 100.00% (grado batería).", 400);
    }
    if (isNaN(waterFootprint) || waterFootprint < 0) {
      return jsonError("La huella hídrica debe ser un valor mayor o igual a 0 m³/t.", 400);
    }
    if (isNaN(carbonFootprint) || carbonFootprint < 0) {
      return jsonError("La huella de carbono debe ser un valor mayor o igual a 0 kg CO₂e/t.", 400);
    }
  }

  const service = createServiceClient();

  // Create or resolve auth user
  let userId: string;
  const { data: newUser, error: createAuthErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (newUser?.user) {
    userId = newUser.user.id;
  } else if (createAuthErr && createAuthErr.message.toLowerCase().includes("already")) {
    const { data: existingUsers } = await service.auth.admin.listUsers();
    const match = existingUsers?.users.find((u) => u.email?.toLowerCase() === email);
    if (!match) {
      return jsonError("El usuario ya existe pero no pudo ser localizado.", 409);
    }
    userId = match.id;

    // Verify user doesn't already have a company row
    const { data: existingComp } = await service
      .from("companies")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingComp) {
      return jsonError("Este correo electrónico ya tiene una empresa asignada en el protocolo.", 409);
    }
  } else {
    return jsonError(createAuthErr?.message || "No se pudo crear el usuario en Auth.", 500);
  }

  // Insert company row
  const companyInsert = {
    id: userId,
    name,
    company_type: companyType,
    wallet_address: rawWallet || null,
    wallet_verified_at: rawWallet ? new Date().toISOString() : null,
    origin_id: companyType === "producer" ? originId : null,
    purity_pct: purityPct,
    water_footprint_m3_per_tonne: waterFootprint,
    carbon_footprint_kg_co2e_per_tonne: carbonFootprint,
  };

  const { data: inserted, error: insertErr } = await service
    .from("companies")
    .insert(companyInsert)
    .select(
      "id, name, company_type, wallet_address, wallet_verified_at, origin_id, purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne, created_at"
    )
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return jsonError("Ya existe una empresa registrada con esa wallet o identificador.", 409);
    }
    return jsonError(insertErr.message || "Error al registrar la empresa.", 500);
  }

  return Response.json(
    {
      company: {
        ...inserted,
        email,
      },
    },
    { status: 201 }
  );
}
