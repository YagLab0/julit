import { CERTIFICATE_MAX_BYTES } from "../../../../audit/validation";
import { jsonError } from "../../../../lib/server/api";
import {
  bytesToHex,
  certificatePath,
  CERTIFICATES_BUCKET,
} from "../../../../lib/server/certificates";
import { createClient } from "../../../../lib/supabase/server";
import { createServiceClient } from "../../../../lib/supabase/service";

const PDF_MAGIC = "%PDF-";

/**
 * Stores the auditor's certificate PDF at `<pda>/<sha256>.pdf`. The server
 * recomputes the digest, so the on-chain audit_hash built from this response
 * provably matches the stored file. Never upserts: a second upload for the
 * same batch is rejected so an existing certificate cannot be replaced
 * after (or before) certification.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ pda: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError("Iniciá sesión para subir el certificado.", 401);
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, company_type, wallet_address, wallet_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!company || company.company_type !== "auditor") {
    return jsonError("Solo las auditoras suben certificados.", 403);
  }
  if (!company.wallet_address || !company.wallet_verified_at) {
    return jsonError("Vinculá la wallet verificada de tu empresa.", 400);
  }

  const { pda } = await params;

  const service = createServiceClient();
  const { data: batch } = await service
    .from("batches")
    .select("pda_address, auditor_wallet, status")
    .eq("pda_address", pda)
    .maybeSingle();

  if (!batch) {
    return jsonError("Lote no encontrado.", 404);
  }
  if (batch.auditor_wallet !== company.wallet_address) {
    return jsonError("Este lote no está designado a tu wallet.", 403);
  }
  if (batch.status !== "created") {
    return jsonError("Este lote ya fue certificado.", 409);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("El cuerpo debe ser multipart/form-data.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("Falta el archivo del certificado (campo file).", 400);
  }
  if (file.type !== "application/pdf") {
    return jsonError("El certificado debe ser un PDF.", 400);
  }
  if (file.size === 0 || file.size > CERTIFICATE_MAX_BYTES) {
    return jsonError("El certificado supera el máximo de 50 MiB.", 400);
  }

  const bytes = await file.arrayBuffer();
  const header = new TextDecoder().decode(bytes.slice(0, 5));
  if (header !== PDF_MAGIC) {
    return jsonError("El archivo no es un PDF válido.", 400);
  }

  const digest = bytesToHex(await crypto.subtle.digest("SHA-256", bytes));
  const path = certificatePath(pda, digest);

  const { error } = await service.storage
    .from(CERTIFICATES_BUCKET)
    .upload(path, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    if (error.message.includes("already exists")) {
      return jsonError("Este certificado ya fue subido.", 409);
    }
    return jsonError("No se pudo guardar el certificado.", 500);
  }

  return Response.json({ digest, path }, { status: 201 });
}
