import { describe, expect, it, vi, beforeEach } from "vitest";
import { address } from "@solana/kit";
import { GET, POST } from "./route";

vi.mock("../../../lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("../../../lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("../../../lib/solana-client", () => ({
  createSolanaClient: vi.fn(),
}));

vi.mock("../../../lib/solana/config", () => ({
  fetchProtocolConfig: vi.fn(),
}));

vi.mock("../../../lib/solana/treasury", () => ({
  fetchTreasuryBalances: vi.fn(),
}));

import { createClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";
import { createSolanaClient } from "../../../lib/solana-client";
import { fetchProtocolConfig } from "../../../lib/solana/config";
import { fetchTreasuryBalances } from "../../../lib/solana/treasury";

const ADMIN_PUBKEY = "AdminWa11et11111111111111111111111111111111";
const TREASURY_PUBKEY = "Treasury11111111111111111111111111111111111";
const USDC_MINT = "UsdcMint11111111111111111111111111111111111";
const CONFIG_PDA = "ConfigPda1111111111111111111111111111111111";
const TREASURY_ATA = "TreasuryAta11111111111111111111111111111111";

describe("GET /api/admin/treasury", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createSolanaClient).mockReturnValue({
      rpc: {} as unknown as ReturnType<typeof createSolanaClient>["rpc"],
    } as unknown as ReturnType<typeof createSolanaClient>);
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Iniciá sesión para ver la tesorería.");
  });

  it("returns 403 when user is not an admin", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-buyer-id" } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { company_type: "buyer" },
            }),
          }),
        }),
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await GET();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe(
      "Solo los administradores pueden acceder a la tesorería del protocolo."
    );
  });

  it("returns 502 when on-chain config fetch fails", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-admin-id" } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "user-admin-id",
                name: "Admin",
                company_type: "admin",
              },
            }),
          }),
        }),
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(fetchProtocolConfig).mockRejectedValue(new Error("RPC timeout"));

    const res = await GET();
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe(
      "No se pudo leer la configuración on-chain del protocolo."
    );
  });

  it("returns 502 when treasury balances query fails", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-admin-id" } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "user-admin-id",
                name: "Admin",
                company_type: "admin",
              },
            }),
          }),
        }),
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(fetchProtocolConfig).mockResolvedValue({
      pda: address(CONFIG_PDA),
      admin: address(ADMIN_PUBKEY),
      treasury: address(TREASURY_PUBKEY),
      feeBps: 100,
      usdcMint: address(USDC_MINT),
      claimMinSecs: 3600n,
      claimMaxSecs: 86400n,
      bump: 255,
    });

    vi.mocked(fetchTreasuryBalances).mockRejectedValue(
      new Error("RPC node error")
    );

    const res = await GET();
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe(
      "No se pudieron consultar los saldos de la tesorería on-chain."
    );
  });

  it("returns 200 with full treasury status, balances, and computed ledger", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-admin-id" } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "user-admin-id",
                name: "JuLit Protocol Admin",
                company_type: "admin",
                wallet_address: ADMIN_PUBKEY,
                wallet_verified_at: "2026-10-08T00:00:00Z",
              },
            }),
          }),
        }),
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(fetchProtocolConfig).mockResolvedValue({
      pda: address(CONFIG_PDA),
      admin: address(ADMIN_PUBKEY),
      treasury: address(TREASURY_PUBKEY),
      feeBps: 100,
      usdcMint: address(USDC_MINT),
      claimMinSecs: 3600n,
      claimMaxSecs: 86400n,
      bump: 255,
    });

    vi.mocked(fetchTreasuryBalances).mockResolvedValue({
      treasury: address(TREASURY_PUBKEY),
      usdcAta: address(TREASURY_ATA),
      sol: {
        lamports: 1_500_000_000n,
        sol: 1.5,
      },
      usdc: {
        rawAmount: "4400000000",
        uiAmount: 4400,
        decimals: 6,
        uiAmountString: "4400",
      },
    });

    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  lot_id: "LOT-001",
                  pda_address: "PdaRedeemed111111111111111111111111111111",
                  status: "redeemed",
                  volume_tonnes: 200,
                  price_usdc: 320000,
                  producer_wallet: "Prod1",
                  buyer_wallet: "Buyer1",
                  redeem_tx_signature: "SigRedeem111",
                  indexed_at: "2026-10-06T12:00:00Z",
                },
                {
                  lot_id: "LOT-002",
                  pda_address: "PdaClaimed2222222222222222222222222222222",
                  status: "claimed",
                  volume_tonnes: 80,
                  price_usdc: 120000,
                  producer_wallet: "Prod2",
                  buyer_wallet: "Buyer2",
                  claim_tx_signature: "SigClaim222",
                  indexed_at: "2026-10-07T12:00:00Z",
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createServiceClient>);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.admin).toEqual({
      id: "user-admin-id",
      name: "JuLit Protocol Admin",
      wallet_address: ADMIN_PUBKEY,
      wallet_verified_at: "2026-10-08T00:00:00Z",
      is_wallet_verified: true,
      matches_onchain_admin: true,
      matches_onchain_treasury: false,
    });

    expect(body.config).toEqual({
      pda: CONFIG_PDA,
      admin: ADMIN_PUBKEY,
      treasury: TREASURY_PUBKEY,
      fee_bps: 100,
      fee_percentage: 1,
      usdc_mint: USDC_MINT,
      claim_min_secs: 3600,
      claim_max_secs: 86400,
      bump: 255,
    });

    expect(body.balances).toEqual({
      treasury: TREASURY_PUBKEY,
      usdc_ata: TREASURY_ATA,
      sol: {
        lamports: "1500000000",
        sol: 1.5,
      },
      usdc: {
        raw_amount: "4400000000",
        ui_amount: 4400,
        decimals: 6,
        ui_amount_string: "4400",
      },
    });

    expect(body.ledger.settled_lots_count).toBe(2);
    expect(body.ledger.total_settled_volume_tonnes).toBe(280);
    expect(body.ledger.total_settled_value_usdc).toBe(440000);
    expect(body.ledger.total_fees_collected_usdc).toBe(4400);

    expect(body.ledger.items).toHaveLength(2);
    expect(body.ledger.items[0].feeUsdc).toBe(3200);
    expect(body.ledger.items[0].producerPayoutUsdc).toBe(316800);
    expect(body.ledger.items[1].feeUsdc).toBe(1200);
    expect(body.ledger.items[1].producerPayoutUsdc).toBe(118800);
  });
});

describe("POST /api/admin/treasury", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createSolanaClient).mockReturnValue({
      rpc: {} as unknown as ReturnType<typeof createSolanaClient>["rpc"],
    } as unknown as ReturnType<typeof createSolanaClient>);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await POST(
      new Request("http://localhost/api/admin/treasury", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-producer-id" } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { company_type: "producer" },
            }),
          }),
        }),
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await POST(
      new Request("http://localhost/api/admin/treasury", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid wallet address", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-admin-id" } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "user-admin-id", company_type: "admin" },
            }),
          }),
        }),
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await POST(
      new Request("http://localhost/api/admin/treasury", {
        method: "POST",
        body: JSON.stringify({ wallet_address: "not-a-valid-solana-address" }),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("La dirección de wallet no es válida.");
  });

  it("returns 200 with verification check result against on-chain config", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-admin-id" } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "user-admin-id",
                name: "JuLit Protocol Admin",
                company_type: "admin",
                wallet_address: ADMIN_PUBKEY,
                wallet_verified_at: "2026-10-08T00:00:00Z",
              },
            }),
          }),
        }),
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(fetchProtocolConfig).mockResolvedValue({
      pda: address(CONFIG_PDA),
      admin: address(ADMIN_PUBKEY),
      treasury: address(TREASURY_PUBKEY),
      feeBps: 100,
      usdcMint: address(USDC_MINT),
      claimMinSecs: 3600n,
      claimMaxSecs: 86400n,
      bump: 255,
    });

    const res = await POST(
      new Request("http://localhost/api/admin/treasury", {
        method: "POST",
        body: JSON.stringify({ wallet_address: ADMIN_PUBKEY }),
      })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.admin.is_wallet_verified).toBe(true);
    expect(body.admin.matches_onchain_admin).toBe(true);
    expect(body.admin.matches_onchain_treasury).toBe(false);
  });
});
