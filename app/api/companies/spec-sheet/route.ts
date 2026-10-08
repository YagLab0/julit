import { jsonError } from "../../../lib/server/api";
import {
  bytesToHex,
  SPEC_SHEETS_BUCKET,
  specSheetPath,
  SPEC_SHEET_MAX_BYTES,
} from "../../../lib/server/spec-sheets";
import { createClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";

const PDF_MAGIC = "%PDF-";

/**
 * Stores a producer's lot spec sheet PDF content-addressed at
 * `<producer_wallet>/<sha256>.pdf`. The server recomputes the digest, so the
 * hash a lot declares in `create_lot` provably matches the stored file.
 * Never upserts: the same PDF is idempotent, a different file gets a
 * different path.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError("Iniciá sesión para subir la ficha técnica.", 401);
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, company_type, wallet_address, wallet_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!company || company.company_type !== "producer") {
    return jsonError("Solo las productoras suben fichas técnicas.", 403);
  }
  if (!company.wallet_address || !company.wallet_verified_at) {
    return jsonError("Vinculá la wallet verificada de tu empresa.", 400);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("El cuerpo debe ser multipart/form-data.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("Falta el archivo de la ficha técnica (campo file).", 400);
  }
  if (file.type !== "application/pdf") {
    return jsonError("La ficha técnica debe ser un PDF.", 400);
  }
  if (file.size === 0) {
    return jsonError("La ficha técnica está vacía.", 400);
  }
  if (file.size > SPEC_SHEET_MAX_BYTES) {
    return jsonError("La ficha técnica supera el máximo de 50 MiB.", 400);
  }

  const bytes = await file.arrayBuffer();
  const header = new TextDecoder().decode(bytes.slice(0, 5));
  if (header !== PDF_MAGIC) {
    return jsonError("El archivo no es un PDF válido.", 400);
  }

  const digest = bytesToHex(await crypto.subtle.digest("SHA-256", bytes));
  const path = specSheetPath(company.wallet_address, digest);

  const service = createServiceClient();
  const { error } = await service.storage
    .from(SPEC_SHEETS_BUCKET)
    .upload(path, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    const { statusCode } = error as { statusCode?: string | number };
    if (
      String(statusCode) === "409" ||
      error.message.includes("already exists")
    ) {
      // Content-addressed: the identical PDF is already stored; the digest is
      // still valid for the lot's spec_sheet_hash.
      return Response.json({ digest, path }, { status: 200 });
    }
    return jsonError("No se pudo guardar la ficha técnica.", 500);
  }

  return Response.json({ digest, path }, { status: 201 });
}
