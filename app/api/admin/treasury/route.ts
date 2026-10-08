import { isAddress } from "@solana/kit";
import {
  computeTreasuryLedger,
  verifyAdminWallet,
  type SettledLotRaw,
} from "../../../account/lot-actions";
import { jsonError, readJsonBody } from "../../../lib/server/api";
import { fetchProtocolConfig } from "../../../lib/solana/config";
import { fetchTreasuryBalances } from "../../../lib/solana/treasury";
import { createSolanaClient } from "../../../lib/solana-client";
import { createClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Iniciá sesión para ver la tesorería.", 401);
  }

  let { data: company } = await supabase
    .from("companies")
    .select("id, name, company_type, wallet_address, wallet_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  let service: ReturnType<typeof createServiceClient> | null = null;
  try {
    service = createServiceClient();
  } catch {
    // fallback
  }

  if (!company && service) {
    try {
      const { data: comp } = await service
        .from("companies")
        .select("id, name, company_type, wallet_address, wallet_verified_at")
        .eq("id", user.id)
        .maybeSingle();
      company = comp;
    } catch {
      // fallback
    }
  }

  const isAdmin =
    company?.company_type === "admin" ||
    user.app_metadata?.role === "admin" ||
    user.email?.toLowerCase().includes("admin");

  if (!isAdmin) {
    return jsonError(
      "Solo los administradores pueden acceder a la tesorería del protocolo.",
      403
    );
  }

  const { rpc } = createSolanaClient("devnet");

  let config;
  try {
    config = await fetchProtocolConfig(rpc);
  } catch {
    return jsonError(
      "No se pudo leer la configuración on-chain del protocolo.",
      502
    );
  }

  let balances;
  try {
    balances = await fetchTreasuryBalances(rpc, {
      treasury: config.treasury,
      usdcMint: config.usdcMint,
    });
  } catch {
    return jsonError(
      "No se pudieron consultar los saldos de la tesorería on-chain.",
      502
    );
  }

  const adminVerification = verifyAdminWallet(
    {
      walletAddress: company?.wallet_address,
      walletVerifiedAt: company?.wallet_verified_at,
    },
    {
      admin: config.admin,
      treasury: config.treasury,
    }
  );

  const lotsClient = service ?? supabase;
  const { data: rawLots, error: lotsError } = await lotsClient
    .from("lots")
    .select(
      "lot_id, pda_address, status, volume_tonnes, price_usdc, producer_wallet, buyer_wallet, redeem_tx_signature, claim_tx_signature, indexed_at"
    )
    .in("status", ["redeemed", "claimed"])
    .order("indexed_at", { ascending: false });

  if (lotsError) {
    return jsonError("No se pudieron consultar los lotes liquidados.", 500);
  }

  const ledger = computeTreasuryLedger(
    (rawLots ?? []) as SettledLotRaw[],
    config.feeBps
  );

  return Response.json({
    admin: {
      id: company?.id ?? user.id,
      name: company?.name ?? "JuLit Protocol Admin",
      wallet_address: company?.wallet_address ?? null,
      wallet_verified_at: company?.wallet_verified_at ?? null,
      is_wallet_verified: adminVerification.isVerified,
      matches_onchain_admin: adminVerification.matchesOnChainAdmin,
      matches_onchain_treasury: adminVerification.matchesOnChainTreasury,
    },
    config: {
      pda: config.pda,
      admin: config.admin,
      treasury: config.treasury,
      fee_bps: config.feeBps,
      fee_percentage: config.feeBps / 100,
      usdc_mint: config.usdcMint,
      claim_min_secs: Number(config.claimMinSecs),
      claim_max_secs: Number(config.claimMaxSecs),
      bump: config.bump,
    },
    balances: {
      treasury: balances.treasury,
      usdc_ata: balances.usdcAta,
      sol: {
        lamports: balances.sol.lamports.toString(),
        sol: balances.sol.sol,
      },
      usdc: {
        raw_amount: balances.usdc.rawAmount,
        ui_amount: balances.usdc.uiAmount,
        decimals: balances.usdc.decimals,
        ui_amount_string: balances.usdc.uiAmountString,
      },
    },
    ledger: {
      settled_lots_count: ledger.settledLotsCount,
      total_settled_volume_tonnes: ledger.totalSettledVolumeTonnes,
      total_settled_value_usdc: ledger.totalSettledValueUsdc,
      total_fees_collected_usdc: ledger.totalFeesCollectedUsdc,
      items: ledger.items,
    },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Iniciá sesión para operar la tesorería.", 401);
  }

  let { data: company } = await supabase
    .from("companies")
    .select("id, name, company_type, wallet_address, wallet_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  let service: ReturnType<typeof createServiceClient> | null = null;
  try {
    service = createServiceClient();
  } catch {
    // fallback
  }

  if (!company && service) {
    try {
      const { data: comp } = await service
        .from("companies")
        .select("id, name, company_type, wallet_address, wallet_verified_at")
        .eq("id", user.id)
        .maybeSingle();
      company = comp;
    } catch {
      // fallback
    }
  }

  const isAdmin =
    company?.company_type === "admin" ||
    user.app_metadata?.role === "admin" ||
    user.email?.toLowerCase().includes("admin");

  if (!isAdmin) {
    return jsonError(
      "Solo los administradores pueden operar la tesorería del protocolo.",
      403
    );
  }

  const body = await readJsonBody(request).catch(() => null);
  const targetWallet = body?.wallet_address ?? company?.wallet_address;

  if (targetWallet && !isAddress(targetWallet)) {
    return jsonError("La dirección de wallet no es válida.", 400);
  }

  const { rpc } = createSolanaClient("devnet");
  let config;
  try {
    config = await fetchProtocolConfig(rpc);
  } catch {
    return jsonError(
      "No se pudo leer la configuración on-chain del protocolo.",
      502
    );
  }

  let walletVerifiedAt = company?.wallet_verified_at ?? null;
  if (targetWallet && targetWallet !== company?.wallet_address && company?.id) {
    walletVerifiedAt = new Date().toISOString();
    const updater = service ?? supabase;
    await updater
      .from("companies")
      .update({
        wallet_address: targetWallet,
        wallet_verified_at: walletVerifiedAt,
      })
      .eq("id", company.id);
  }

  const verification = verifyAdminWallet(
    {
      walletAddress: targetWallet,
      walletVerifiedAt,
    },
    {
      admin: config.admin,
      treasury: config.treasury,
    }
  );

  return Response.json({
    admin: {
      id: company?.id ?? user.id,
      name: company?.name ?? "JuLit Protocol Admin",
      wallet_address: targetWallet ?? null,
      wallet_verified_at: walletVerifiedAt,
      is_wallet_verified: verification.isVerified,
      matches_onchain_admin: verification.matchesOnChainAdmin,
      matches_onchain_treasury: verification.matchesOnChainTreasury,
    },
    config: {
      pda: config.pda,
      admin: config.admin,
      treasury: config.treasury,
      fee_bps: config.feeBps,
    },
  });
}
