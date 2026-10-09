import { jsonError, readJsonBody } from "../../../lib/server/api";
import { createClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";
import { ORIGIN_COLUMNS, type Origin } from "../../../explorer/data/origins";

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

  let service;
  try {
    service = createServiceClient();
  } catch {
    // fallback
  }

  const client = service ?? supabase;
  const { data: comp } = await client
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function GET() {
  const { error } = await assertAdminUser();
  if (error) return error;

  const service = createServiceClient();
  const { data, error: dbError } = await service
    .from("origins")
    .select(ORIGIN_COLUMNS)
    .order("name", { ascending: true });

  if (dbError) {
    return jsonError("Error al consultar el catálogo de orígenes.", 500);
  }

  return Response.json({ origins: (data ?? []) as Origin[] });
}

export async function POST(request: Request) {
  const { error: authErr } = await assertAdminUser();
  if (authErr) return authErr;

  const body = await readJsonBody(request).catch(() => null);
  if (!body || typeof body !== "object") {
    return jsonError("Cuerpo de solicitud JSON no válido.", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const code =
    typeof body.code === "string"
      ? body.code.trim().toUpperCase()
      : "";
  const salar =
    typeof body.salar === "string" && body.salar.trim()
      ? body.salar.trim()
      : name;
  const producer =
    typeof body.producer === "string" ? body.producer.trim() : "";
  const shareholders =
    typeof body.shareholders === "string" && body.shareholders.trim()
      ? body.shareholders.trim()
      : "100% Capital Privado";

  if (!name || name.length < 2) {
    return jsonError("El nombre del salar debe tener al menos 2 caracteres.", 400);
  }

  if (!code || !/^[A-Z0-9_-]{2,10}$/.test(code)) {
    return jsonError(
      "El código debe tener entre 2 y 10 caracteres alfanuméricos en mayúsculas (ej: CAU).",
      400
    );
  }

  if (!producer || producer.length < 2) {
    return jsonError("La empresa productora debe tener al menos 2 caracteres.", 400);
  }

  const longitude = Number(body.longitude);
  const latitude = Number(body.latitude);

  if (isNaN(longitude) || longitude < -180 || longitude > 180) {
    return jsonError(
      "La longitud debe ser un número decimal entre -180 y 180.",
      400
    );
  }

  if (isNaN(latitude) || latitude < -90 || latitude > 90) {
    return jsonError(
      "La latitud debe ser un número decimal entre -90 y 90.",
      400
    );
  }

  const capacityTpa = Number(body.capacity_tpa);
  if (isNaN(capacityTpa) || capacityTpa <= 0 || !Number.isInteger(capacityTpa)) {
    return jsonError(
      "La capacidad anual (tpa) debe ser un entero positivo mayor a cero.",
      400
    );
  }

  const altitudeM =
    body.altitude_m !== undefined && body.altitude_m !== null && body.altitude_m !== ""
      ? Number(body.altitude_m)
      : null;

  if (altitudeM !== null && (isNaN(altitudeM) || altitudeM <= 0)) {
    return jsonError("La altitud (msnm) debe ser un número positivo.", 400);
  }

  const waterM3PerTonne =
    body.water_m3_per_tonne !== undefined &&
    body.water_m3_per_tonne !== null &&
    body.water_m3_per_tonne !== ""
      ? Number(body.water_m3_per_tonne)
      : null;

  if (waterM3PerTonne !== null && (isNaN(waterM3PerTonne) || waterM3PerTonne < 0)) {
    return jsonError("La huella hídrica (m³/t) no puede ser negativa.", 400);
  }

  const note =
    typeof body.note === "string" && body.note.trim()
      ? body.note.trim()
      : `Salar ${name} registrado en el catálogo oficial de JuLit.`;

  const sourceLabel =
    typeof body.source_label === "string" && body.source_label.trim()
      ? body.source_label.trim()
      : "Informe Técnico JuLit";

  const sourceUrl =
    typeof body.source_url === "string" && body.source_url.trim()
      ? body.source_url.trim()
      : "https://julit.dev";

  // --- Producer company account (one mining company = one account = one origin) ---
  const companyBody =
    body.company && typeof body.company === "object" ? (body.company as Record<string, unknown>) : null;
  if (!companyBody) {
    return jsonError(
      "La carga de una minera requiere los datos de su cuenta (bloque `company`).",
      400
    );
  }

  const companyEmail =
    typeof companyBody.email === "string" ? companyBody.email.trim().toLowerCase() : "";
  if (!companyEmail || !companyEmail.includes("@")) {
    return jsonError("Ingresá un correo electrónico válido para la cuenta de la minera.", 400);
  }

  const companyPassword =
    typeof companyBody.password === "string" && companyBody.password.length >= 6
      ? companyBody.password
      : "julit-demo-2026";

  const companyWallet =
    typeof companyBody.wallet_address === "string" ? companyBody.wallet_address.trim() : "";
  if (companyWallet && !SOLANA_ADDRESS_REGEX.test(companyWallet)) {
    return jsonError("La dirección de wallet Solana ingresada no es válida.", 400);
  }

  // Production specs: all three together or none (ADR-0020)
  const hasPurity = companyBody.purity_pct !== undefined && companyBody.purity_pct !== null && companyBody.purity_pct !== "";
  const hasWater = companyBody.water_footprint_m3_per_tonne !== undefined && companyBody.water_footprint_m3_per_tonne !== null && companyBody.water_footprint_m3_per_tonne !== "";
  const hasCarbon = companyBody.carbon_footprint_kg_co2e_per_tonne !== undefined && companyBody.carbon_footprint_kg_co2e_per_tonne !== null && companyBody.carbon_footprint_kg_co2e_per_tonne !== "";

  let purityPct: number | null = null;
  let companyWater: number | null = null;
  let carbonFootprint: number | null = null;

  if (hasPurity || hasWater || hasCarbon) {
    if (!(hasPurity && hasWater && hasCarbon)) {
      return jsonError(
        "Las especificaciones de producción (pureza Li₂CO₃, huella hídrica y huella de carbono) deben enviarse juntas.",
        400
      );
    }

    purityPct = Number(companyBody.purity_pct);
    companyWater = Number(companyBody.water_footprint_m3_per_tonne);
    carbonFootprint = Number(companyBody.carbon_footprint_kg_co2e_per_tonne);

    if (isNaN(purityPct) || purityPct < 99.5 || purityPct > 100) {
      return jsonError("La pureza Li₂CO₃ debe estar entre 99.50% y 100.00% (grado batería).", 400);
    }
    if (isNaN(companyWater) || companyWater < 0) {
      return jsonError("La huella hídrica debe ser un valor mayor o igual a 0 m³/t.", 400);
    }
    if (isNaN(carbonFootprint) || carbonFootprint < 0) {
      return jsonError("La huella de carbono debe ser un valor mayor o igual a 0 kg CO₂e/t.", 400);
    }
  }

  const rawId =
    typeof body.id === "string" && body.id.trim()
      ? slugify(body.id.trim())
      : slugify(name);

  const id = rawId || slugify(code);

  const service = createServiceClient();

  // Check for uniqueness conflicts (id, code, name)
  const { data: existing } = await service
    .from("origins")
    .select("id, code, name")
    .or(`id.eq.${id},code.eq.${code},name.eq.${name}`)
    .maybeSingle();

  if (existing) {
    return jsonError(
      "Ya existe un salar registrado con ese identificador, código o nombre.",
      409
    );
  }

  const newOrigin = {
    id,
    name,
    code,
    salar,
    producer,
    shareholders,
    longitude,
    latitude,
    capacity_tpa: capacityTpa,
    altitude_m: altitudeM ? Math.round(altitudeM) : null,
    water_m3_per_tonne: waterM3PerTonne !== null ? Number(waterM3PerTonne.toFixed(2)) : null,
    note,
    source_label: sourceLabel,
    source_url: sourceUrl,
  };

  const { data: inserted, error: insertError } = await service
    .from("origins")
    .insert(newOrigin)
    .select(ORIGIN_COLUMNS)
    .single();

  if (insertError) {
    return jsonError(
      `Error al registrar el salar en la base de datos: ${insertError.message}`,
      500
    );
  }

  // Create or resolve the auth user for the producer account
  let userId: string;
  let createdUser = false;
  const { data: newUser, error: createAuthErr } = await service.auth.admin.createUser({
    email: companyEmail,
    password: companyPassword,
    email_confirm: true,
  });

  if (newUser?.user) {
    userId = newUser.user.id;
    createdUser = true;
  } else if (createAuthErr && createAuthErr.message.toLowerCase().includes("already")) {
    const { data: existingUsers } = await service.auth.admin.listUsers();
    const match = existingUsers?.users.find(
      (u) => u.email?.toLowerCase() === companyEmail
    );
    if (!match) {
      await service.from("origins").delete().eq("id", id);
      return jsonError("El usuario ya existe pero no pudo ser localizado.", 409);
    }
    userId = match.id;

    const { data: existingComp } = await service
      .from("companies")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingComp) {
      await service.from("origins").delete().eq("id", id);
      return jsonError(
        "Este correo electrónico ya tiene una empresa asignada en el protocolo.",
        409
      );
    }
  } else {
    await service.from("origins").delete().eq("id", id);
    return jsonError(
      createAuthErr?.message || "No se pudo crear el usuario en Auth.",
      500
    );
  }

  const { data: insertedCompany, error: companyErr } = await service
    .from("companies")
    .insert({
      id: userId,
      name: producer,
      company_type: "producer",
      wallet_address: companyWallet || null,
      wallet_verified_at: companyWallet ? new Date().toISOString() : null,
      origin_id: id,
      purity_pct: purityPct,
      water_footprint_m3_per_tonne: companyWater,
      carbon_footprint_kg_co2e_per_tonne: carbonFootprint,
    })
    .select(
      "id, name, company_type, wallet_address, wallet_verified_at, origin_id, purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne, created_at"
    )
    .single();

  if (companyErr) {
    await service.from("origins").delete().eq("id", id);
    if (createdUser) await service.auth.admin.deleteUser(userId);
    return jsonError(
      `Error al registrar la empresa minera: ${companyErr.message}`,
      500
    );
  }

  return Response.json(
    {
      origin: inserted,
      company: { ...insertedCompany, email: companyEmail },
    },
    { status: 201 }
  );
}
