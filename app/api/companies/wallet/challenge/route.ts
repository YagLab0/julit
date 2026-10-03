import { randomBytes } from "node:crypto";
import { isAddress } from "@solana/kit";
import { jsonError, readJsonBody } from "../../../../lib/server/api";
import {
  SOLANA_WALLET_PATTERN,
  WALLET_LINK_CHALLENGE_TTL_MS,
  buildWalletLinkMessage,
} from "../../../../lib/server/wallet-link";
import { createClient } from "../../../../lib/supabase/server";
import { createServiceClient } from "../../../../lib/supabase/service";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Iniciá sesión para vincular una wallet.", 401);
  }
  if (!user.email) {
    return jsonError("Tu cuenta no tiene un email asociado.", 400);
  }

  const body = await readJsonBody(request);
  const walletAddress = body?.wallet_address;

  if (
    typeof walletAddress !== "string" ||
    !SOLANA_WALLET_PATTERN.test(walletAddress) ||
    !isAddress(walletAddress)
  ) {
    return jsonError("La dirección de la wallet no es válida.", 400);
  }

  const service = createServiceClient();
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

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + WALLET_LINK_CHALLENGE_TTL_MS);
  const nonce = randomBytes(32).toString("base64url");
  const domain =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "localhost:3000";

  // Hygiene: drop challenges of this account that can no longer be used.
  await service
    .from("wallet_link_challenges")
    .delete()
    .eq("auth_user_id", user.id)
    .lt("expires_at", issuedAt.toISOString());

  const { error } = await service.from("wallet_link_challenges").insert({
    nonce,
    auth_user_id: user.id,
    account_email: user.email,
    wallet_address: walletAddress,
    domain,
    issued_at: issuedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return jsonError("No se pudo emitir el pedido de vinculación.", 500);
  }

  const message = buildWalletLinkMessage({
    accountEmail: user.email,
    domain,
    walletAddress,
    nonce,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  return Response.json({
    nonce,
    message,
    expires_at: expiresAt.toISOString(),
  });
}
