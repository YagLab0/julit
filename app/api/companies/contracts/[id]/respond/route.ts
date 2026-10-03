import { jsonError, readJsonBody } from "../../../../../lib/server/api";
import {
  CONTRACT_SIGNATURE_PATTERN,
  UUID_PATTERN,
  buildContractAgreementMessage,
  verifyContractSignature,
} from "../../../../../lib/server/contracts";
import { createClient } from "../../../../../lib/supabase/server";
import { createServiceClient } from "../../../../../lib/supabase/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Iniciá sesión para responder ofertas de contrato.", 401);
  }

  const { id } = await params;
  const body = await readJsonBody(request);
  const status = typeof body?.status === "string" ? body.status : undefined;
  const signature =
    typeof body?.signature === "string" ? body.signature : undefined;
  const timestamp =
    typeof body?.timestamp === "string" ? body.timestamp : undefined;

  if (
    !UUID_PATTERN.test(id) ||
    (status !== "accepted" && status !== "revoked")
  ) {
    return jsonError("El pedido de respuesta no es válido.", 400);
  }

  if (status === "accepted") {
    if (
      !signature ||
      !CONTRACT_SIGNATURE_PATTERN.test(signature) ||
      !timestamp ||
      isNaN(new Date(timestamp).getTime())
    ) {
      return jsonError(
        "Para aceptar un contrato comercial se requiere una firma Ed25519 válida.",
        400
      );
    }
  }

  const service = createServiceClient();
  const { data: contract } = await service
    .from("company_contracts")
    .select(
      `
      id,
      producer_id,
      counterparty_id,
      initiator_id,
      status,
      producer:companies!company_contracts_producer_id_fkey(id, name, wallet_address),
      counterparty:companies!company_contracts_counterparty_id_fkey(id, name, wallet_address)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (!contract) {
    return jsonError("Solicitud de contrato no encontrada.", 404);
  }

  // The expected responder is the non-initiating party
  const expectedResponderId =
    contract.initiator_id === contract.producer_id
      ? contract.counterparty_id
      : contract.producer_id;

  if (user.id !== expectedResponderId) {
    return jsonError(
      "No tenés autorización para responder esta solicitud de contrato.",
      403
    );
  }

  if (contract.status !== "pending") {
    return jsonError("Esta solicitud de contrato ya fue respondida.", 409);
  }

  // Type assertions for joined producer and counterparty
  const producer = Array.isArray(contract.producer)
    ? contract.producer[0]
    : contract.producer;
  const counterparty = Array.isArray(contract.counterparty)
    ? contract.counterparty[0]
    : contract.counterparty;

  if (!producer?.wallet_address || !counterparty?.wallet_address) {
    return jsonError(
      "Una de las empresas intervinientes no posee wallet vinculada.",
      400
    );
  }

  const initiatorWallet =
    contract.initiator_id === contract.producer_id
      ? producer.wallet_address
      : counterparty.wallet_address;

  const responderWallet =
    user.id === contract.producer_id
      ? producer.wallet_address
      : counterparty.wallet_address;

  const nowIso = new Date().toISOString();

  if (status === "accepted") {
    // Reconstruct canonical message and verify signature
    const message = buildContractAgreementMessage({
      producerWallet: producer.wallet_address,
      counterpartyWallet: counterparty.wallet_address,
      initiatorWallet,
      timestamp: timestamp!,
    });

    const isValid = await verifyContractSignature(
      responderWallet,
      message,
      signature!
    );

    if (!isValid) {
      return jsonError(
        "La firma de aceptación no es válida para la wallet vinculada.",
        400
      );
    }

    const { data, error } = await service
      .from("company_contracts")
      .update({
        status: "accepted",
        counterparty_signature: signature,
        counterparty_signed_at: new Date(timestamp!).toISOString(),
        responded_at: nowIso,
      })
      .eq("id", id)
      .eq("status", "pending")
      .select(
        "id, status, counterparty_signature, counterparty_signed_at, responded_at"
      )
      .single();

    if (error) {
      return jsonError(
        "No se pudo aceptar la solicitud. Intentá de nuevo.",
        500
      );
    }

    return Response.json({ contract: data });
  }

  // Revoke / Reject flow
  const { data, error } = await service
    .from("company_contracts")
    .update({
      status: "revoked",
      responded_at: nowIso,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id, status, responded_at")
    .single();

  if (error) {
    return jsonError(
      "No se pudo rechazar la solicitud. Intentá de nuevo.",
      500
    );
  }

  return Response.json({ contract: data });
}
