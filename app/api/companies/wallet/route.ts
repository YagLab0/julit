import { isAddress } from "@solana/kit";
import { jsonError, readJsonBody } from "../../../lib/server/api";
import {
  SIGNATURE_PATTERN,
  SOLANA_WALLET_PATTERN,
  WALLET_LINK_NONCE_PATTERN,
  buildWalletLinkMessage,
  verifyWalletLinkSignature,
} from "../../../lib/server/wallet-link";
import { createClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Iniciá sesión para vincular una wallet.", 401);
  }

  const body = await readJsonBody(request);
  const nonce = body?.nonce;
  const walletAddress = body?.wallet_address;
  const signature = body?.signature;

  if (
    typeof nonce !== "string" ||
    !WALLET_LINK_NONCE_PATTERN.test(nonce) ||
    typeof walletAddress !== "string" ||
    !SOLANA_WALLET_PATTERN.test(walletAddress) ||
    !isAddress(walletAddress) ||
    typeof signature !== "string" ||
    !SIGNATURE_PATTERN.test(signature)
  ) {
    return jsonError("El pedido de vinculación no es válido.", 400);
  }

  const service = createServiceClient();
  const { data: challenge } = await service
    .from("wallet_link_challenges")
    .select(
      "nonce, auth_user_id, account_email, wallet_address, domain, issued_at, expires_at, consumed_at"
    )
    .eq("nonce", nonce)
    .maybeSingle();

  if (!challenge || challenge.auth_user_id !== user.id) {
    return jsonError(
      "El pedido de vinculación no es válido o expiró. Volvé a intentar.",
      409
    );
  }
  if (challenge.wallet_address !== walletAddress) {
    return jsonError("El pedido no corresponde a la wallet enviada.", 409);
  }
  if (challenge.consumed_at) {
    return jsonError("Este pedido de vinculación ya fue usado.", 409);
  }
  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    return jsonError("El pedido de vinculación expiró. Volvé a intentar.", 409);
  }

  const message = buildWalletLinkMessage({
    accountEmail: challenge.account_email,
    domain: challenge.domain,
    walletAddress: challenge.wallet_address,
    nonce: challenge.nonce,
    issuedAt: new Date(challenge.issued_at).toISOString(),
    expiresAt: new Date(challenge.expires_at).toISOString(),
  });

  const validSignature = await verifyWalletLinkSignature(
    walletAddress,
    message,
    signature
  );

  if (!validSignature) {
    return jsonError("La firma no es válida para esta wallet.", 400);
  }

  // Friendly pre-checks; link_company_wallet still enforces both atomically.
  const { data: company } = await service
    .from("companies")
    .select("id, wallet_address")
    .eq("id", user.id)
    .maybeSingle();

  if (!company) {
    return jsonError("Primero registrá tu empresa.", 409);
  }
  if (company.wallet_address) {
    return jsonError("Tu empresa ya tiene una wallet vinculada.", 409);
  }

  const { data: walletOwner } = await service
    .from("companies")
    .select("id")
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  if (walletOwner) {
    return jsonError("Esa wallet ya está vinculada a otra empresa.", 409);
  }

  const { data, error } = await service.rpc("link_company_wallet", {
    p_auth_user_id: user.id,
    p_wallet_address: walletAddress,
    p_nonce: nonce,
  });

  if (error) {
    if (error.code === "23505") {
      return jsonError("Esa wallet ya está vinculada a otra empresa.", 409);
    }
    if (error.code === "23514") {
      return jsonError(
        "El pedido de vinculación expiró o ya fue usado. Volvé a intentar.",
        409
      );
    }
    return jsonError("No se pudo vincular la wallet. Intentá de nuevo.", 500);
  }

  const linked = Array.isArray(data) ? data[0] : data;

  return Response.json({
    wallet_address: linked?.wallet_address ?? walletAddress,
    wallet_verified_at: linked?.wallet_verified_at ?? null,
  });
}
