import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const buyerWallet = url.searchParams.get("buyer_wallet");
  const status = url.searchParams.get("status");
  const originId = url.searchParams.get("origin_id");
  const producerWallet = url.searchParams.get("producer_wallet");

  const supabase = await createClient();

  let query = supabase
    .from("batches")
    .select(
      "batch_id, pda_address, producer_wallet, auditor_wallet, reserved_buyer_wallet, buyer_wallet, origin_id, volume_tonnes, purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne, price_usdc, status, audit_sha256, audit_certificate_path, esg_approved, eu_regulation_assessment, creation_tx_signature, audit_tx_signature, completion_tx_signature, observed_slot, indexed_at"
    )
    .order("indexed_at", { ascending: false });

  if (buyerWallet) {
    query = query.eq("buyer_wallet", buyerWallet);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (originId) {
    query = query.eq("origin_id", originId);
  }
  if (producerWallet) {
    query = query.eq("producer_wallet", producerWallet);
  }

  const { data: batches, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ batches: batches ?? [] });
}
