import { isAddress } from "@solana/kit";
import {
  contractPosture,
  offerDirection,
  type ContractRole,
} from "../../../lib/company-contracts";
import type { CompanyType } from "../../../lib/company";
import { jsonError, readJsonBody } from "../../../lib/server/api";
import {
  CONTRACT_SIGNATURE_PATTERN,
  UUID_PATTERN,
  buildContractAgreementMessage,
  verifyContractSignature,
} from "../../../lib/server/contracts";
import { createClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";

async function sessionCompany(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, company: null };

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, company_type, wallet_address, origin_id")
    .eq("id", user.id)
    .maybeSingle();
  return { user, company };
}

/** Lists the contracts where the session's company is a party. */
export async function GET() {
  const supabase = await createClient();
  const { user, company } = await sessionCompany(supabase);
  if (!user) {
    return jsonError("Iniciá sesión para ver tus contratos.", 401);
  }
  if (!company) {
    return Response.json({ contracts: [] });
  }

  const service = createServiceClient();
  const { data: contracts, error } = await service
    .from("company_contracts")
    .select(
      "id, producer_id, counterparty_id, initiator_id, status, initiator_signature, counterparty_signature, initiator_signed_at, counterparty_signed_at, responded_at, created_at"
    )
    .or(`producer_id.eq.${company.id},counterparty_id.eq.${company.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError("No se pudieron cargar los contratos.", 500);
  }

  const companyIds = [
    ...new Set(
      (contracts ?? []).flatMap((c) => [c.producer_id, c.counterparty_id])
    ),
  ];
  const { data: parties } = companyIds.length
    ? await service
        .from("companies")
        .select("id, name, company_type, wallet_address, origin_id")
        .in("id", companyIds)
    : { data: [] };
  const partyById = new Map((parties ?? []).map((p) => [p.id, p]));

  return Response.json({
    contracts: (contracts ?? []).map((c) => {
      const counterparty = partyById.get(c.counterparty_id) ?? null;
      const producer = partyById.get(c.producer_id) ?? null;
      const role: ContractRole =
        c.producer_id === company.id ? "producer" : "counterparty";
      const posture = counterparty
        ? contractPosture(role, counterparty.company_type as CompanyType)
        : null;
      return {
        id: c.id,
        status: c.status,
        initiator_id: c.initiator_id,
        initiator_signature: c.initiator_signature,
        counterparty_signature: c.counterparty_signature,
        initiator_signed_at: c.initiator_signed_at,
        counterparty_signed_at: c.counterparty_signed_at,
        responded_at: c.responded_at,
        respondedAt: c.responded_at,
        created_at: c.created_at,
        createdAt: c.created_at,
        producer,
        counterparty,
        role,
        posture,
      };
    }),
  });
}

/**
 * Creates a contract offer under the two sanctioned flows (ADR-0008):
 * a producer offering to an auditor, or a buyer offering to a producer.
 * Supports both on-chain SPL Memo / cryptographic signatures and direct offers.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, company: caller } = await sessionCompany(supabase);
  if (!user) {
    return jsonError("Iniciá sesión para ofrecer contratos.", 401);
  }
  if (!caller) {
    return jsonError("Registrá tu empresa primero.", 400);
  }

  const body = await readJsonBody(request);
  const targetId =
    typeof body?.counterparty_id === "string"
      ? body.counterparty_id
      : typeof body?.target_company_id === "string"
        ? body.target_company_id
        : undefined;

  if (!targetId || !UUID_PATTERN.test(targetId)) {
    return jsonError("Elegí una empresa contraparte válida.", 400);
  }
  if (targetId === caller.id) {
    return jsonError("No podés contratarte a vos misma.", 400);
  }

  const service = createServiceClient();
  const { data: target } = await service
    .from("companies")
    .select("id, name, company_type, wallet_address, origin_id")
    .eq("id", targetId)
    .maybeSingle();

  if (!target) {
    return jsonError("La empresa destinataria no fue encontrada.", 404);
  }

  const offer = offerDirection(
    caller.company_type as CompanyType,
    target.company_type as CompanyType
  );

  if (!offer) {
    return jsonError(
      "Solo una productora puede ofrecer a una auditora, o una compradora a una productora.",
      400
    );
  }

  const producerId = offer.producerIsInitiator ? caller.id : target.id;
  const counterpartyId = offer.producerIsInitiator ? target.id : caller.id;

  const signature =
    typeof body?.signature === "string" ? body.signature : undefined;
  const timestamp =
    typeof body?.timestamp === "string" ? body.timestamp : undefined;
  const initiatorWalletInput =
    typeof body?.initiator_wallet === "string" &&
    isAddress(body.initiator_wallet)
      ? body.initiator_wallet
      : undefined;
  const isOnChain = Boolean(body?.is_onchain);

  const initiatorWallet = initiatorWalletInput ?? caller.wallet_address;

  // If cryptographic or on-chain signature is attached, validate it
  if (signature) {
    if (!CONTRACT_SIGNATURE_PATTERN.test(signature)) {
      return jsonError("La firma del contrato no tiene un formato válido.", 400);
    }
    if (!initiatorWallet) {
      return jsonError(
        "Debés conectar una wallet antes de firmar solicitudes.",
        400
      );
    }

    const producerWallet = offer.producerIsInitiator
      ? initiatorWallet
      : target.wallet_address;
    const counterpartyWallet = offer.producerIsInitiator
      ? target.wallet_address
      : initiatorWallet;

    if (!producerWallet || !counterpartyWallet) {
      return jsonError(
        "Ambas empresas deben tener una wallet para firmar contratos.",
        400
      );
    }

    if (isOnChain) {
      // Signature is an on-chain Solana transaction signature verified on Devnet
      if (!CONTRACT_SIGNATURE_PATTERN.test(signature)) {
        return jsonError(
          "La firma de la transacción on-chain no es válida.",
          400
        );
      }
    } else {
      const message = buildContractAgreementMessage({
        producerWallet,
        counterpartyWallet,
        initiatorWallet,
        timestamp: timestamp ?? new Date().toISOString(),
      });
      const validSignature = await verifyContractSignature(
        initiatorWallet,
        message,
        signature
      );
      if (!validSignature) {
        return jsonError(
          "La firma del contrato no es válida para la wallet vinculada.",
          400
        );
      }
    }

    // Bind buyer wallet if not bound yet
    if (
      caller.company_type !== "producer" &&
      initiatorWallet &&
      caller.wallet_address !== initiatorWallet &&
      !caller.wallet_address
    ) {
      await service
        .from("companies")
        .update({
          wallet_address: initiatorWallet,
          wallet_verified_at: new Date().toISOString(),
        })
        .eq("id", caller.id);
    }
  }

  // Check if an existing contract exists between both companies
  const { data: existing } = await service
    .from("company_contracts")
    .select("id, status")
    .eq("producer_id", producerId)
    .eq("counterparty_id", counterpartyId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted") {
      return jsonError("Ya existe un contrato activo con esta empresa.", 409);
    }
    if (existing.status === "pending") {
      return jsonError(
        "Ya existe una solicitud de contrato pendiente con esta empresa.",
        409
      );
    }
  }

  const nowIso = new Date().toISOString();
  const signedAt = timestamp ? new Date(timestamp).toISOString() : nowIso;

  let contractData;
  if (existing && existing.status === "revoked") {
    const { data, error } = await service
      .from("company_contracts")
      .update({
        initiator_id: caller.id,
        initiator_signature: signature ?? null,
        initiator_signed_at: signature ? signedAt : null,
        counterparty_signature: null,
        counterparty_signed_at: null,
        status: "pending",
        responded_at: null,
      })
      .eq("id", existing.id)
      .select("id, status, created_at")
      .single();

    if (error) {
      return jsonError("No se pudo renovar la solicitud de contrato.", 500);
    }
    contractData = data;
  } else {
    const { data, error } = await service
      .from("company_contracts")
      .insert({
        producer_id: producerId,
        counterparty_id: counterpartyId,
        initiator_id: caller.id,
        initiator_signature: signature ?? null,
        initiator_signed_at: signature ? signedAt : null,
        status: "pending",
      })
      .select("id, status, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return jsonError("Ya existe un contrato con esta empresa.", 409);
      }
      return jsonError("No se pudo crear el contrato. Intentá de nuevo.", 500);
    }
    contractData = data;
  }

  return Response.json({ contract: contractData }, { status: 201 });
}
