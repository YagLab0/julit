import { jsonError, readJsonBody } from "../../../lib/server/api";
import {
  CONTRACT_SIGNATURE_PATTERN,
  UUID_PATTERN,
  buildContractAgreementMessage,
  verifyContractSignature,
} from "../../../lib/server/contracts";
import { createClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Iniciá sesión para consultar tus contratos.", 401);
  }

  const service = createServiceClient();
  const { data: contracts, error } = await service
    .from("company_contracts")
    .select(
      `
      id,
      producer_id,
      counterparty_id,
      initiator_id,
      status,
      initiator_signature,
      counterparty_signature,
      initiator_signed_at,
      counterparty_signed_at,
      responded_at,
      created_at,
      producer:companies!company_contracts_producer_id_fkey(id, name, company_type, wallet_address, origin_id),
      counterparty:companies!company_contracts_counterparty_id_fkey(id, name, company_type, wallet_address)
    `
    )
    .or(`producer_id.eq.${user.id},counterparty_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError("Error al cargar los contratos de la empresa.", 500);
  }

  return Response.json({ contracts: contracts ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Iniciá sesión para crear un contrato comercial.", 401);
  }

  const body = await readJsonBody(request);
  const targetCompanyId =
    typeof body?.target_company_id === "string"
      ? body.target_company_id
      : undefined;
  const signature =
    typeof body?.signature === "string" ? body.signature : undefined;
  const timestamp =
    typeof body?.timestamp === "string" ? body.timestamp : undefined;

  if (
    !targetCompanyId ||
    !UUID_PATTERN.test(targetCompanyId) ||
    !signature ||
    !CONTRACT_SIGNATURE_PATTERN.test(signature) ||
    !timestamp ||
    isNaN(new Date(timestamp).getTime())
  ) {
    return jsonError("El pedido de contrato no es válido.", 400);
  }

  if (user.id === targetCompanyId) {
    return jsonError("No podés crear un contrato con tu propia empresa.", 400);
  }

  const service = createServiceClient();

  // Fetch caller company
  const { data: caller } = await service
    .from("companies")
    .select(
      "id, name, company_type, wallet_address, wallet_verified_at, origin_id"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!caller || !caller.wallet_address || !caller.wallet_verified_at) {
    return jsonError(
      "Debés vincular y verificar tu wallet antes de solicitar contratos.",
      403
    );
  }

  // Fetch target company
  const { data: target } = await service
    .from("companies")
    .select(
      "id, name, company_type, wallet_address, wallet_verified_at, origin_id"
    )
    .eq("id", targetCompanyId)
    .maybeSingle();

  if (!target || !target.wallet_address) {
    return jsonError(
      "La empresa destinataria no fue encontrada o no tiene una wallet vinculada.",
      404
    );
  }

  // Determine roles: one party must be producer, the other buyer or auditor
  let producer = caller;
  let counterparty = target;

  if (caller.company_type === "producer") {
    if (target.company_type !== "buyer" && target.company_type !== "auditor") {
      return jsonError(
        "Un productor sólo puede solicitar contratos a compradores o auditores.",
        400
      );
    }
    producer = caller;
    counterparty = target;
  } else if (
    caller.company_type === "buyer" ||
    caller.company_type === "auditor"
  ) {
    if (target.company_type !== "producer") {
      return jsonError(
        "Un comprador o auditor sólo puede solicitar contratos a productores.",
        400
      );
    }
    producer = target;
    counterparty = caller;
  } else {
    return jsonError("Tipo de empresa no autorizada para contratos.", 403);
  }

  // Rebuild canonical agreement message
  const message = buildContractAgreementMessage({
    producerWallet: producer.wallet_address,
    counterpartyWallet: counterparty.wallet_address,
    initiatorWallet: caller.wallet_address,
    timestamp,
  });

  const validSignature = await verifyContractSignature(
    caller.wallet_address,
    message,
    signature
  );

  if (!validSignature) {
    return jsonError(
      "La firma del contrato no es válida para la wallet vinculada.",
      400
    );
  }

  // Check if an existing contract exists between the two companies
  const { data: existing } = await service
    .from("company_contracts")
    .select("id, status")
    .eq("producer_id", producer.id)
    .eq("counterparty_id", counterparty.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted") {
      return jsonError(
        "Ya existe un contrato activo entre ambas empresas.",
        409
      );
    }
    if (existing.status === "pending") {
      return jsonError(
        "Ya existe una solicitud de contrato pendiente entre ambas empresas.",
        409
      );
    }
  }

  let contractData;
  if (existing && existing.status === "revoked") {
    const { data, error } = await service
      .from("company_contracts")
      .update({
        initiator_id: caller.id,
        initiator_signature: signature,
        initiator_signed_at: new Date(timestamp).toISOString(),
        counterparty_signature: null,
        counterparty_signed_at: null,
        status: "pending",
        responded_at: null,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Error al actualizar contrato revocado:", error);
      return jsonError(
        error.message
          ? `Error al registrar la solicitud de contrato: ${error.message}`
          : "Error al registrar la solicitud de contrato.",
        500
      );
    }
    contractData = data;
  } else {
    const { data, error } = await service
      .from("company_contracts")
      .insert({
        producer_id: producer.id,
        counterparty_id: counterparty.id,
        initiator_id: caller.id,
        initiator_signature: signature,
        initiator_signed_at: new Date(timestamp).toISOString(),
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error al registrar solicitud de contrato:", error);
      return jsonError(
        error.message
          ? `Error al registrar la solicitud de contrato: ${error.message}`
          : "Error al registrar la solicitud de contrato.",
        500
      );
    }
    contractData = data;
  }

  return Response.json({ contract: contractData }, { status: 201 });
}
