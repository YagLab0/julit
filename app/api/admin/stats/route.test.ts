import { describe, expect, it, vi, beforeEach } from "vitest";
import { calculateProtocolStats } from "../../../account/account-data";
import { GET } from "./route";

vi.mock("../../../lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("../../../lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";

describe("calculateProtocolStats", () => {
  it("handles empty arrays gracefully", () => {
    const stats = calculateProtocolStats({
      companies: [],
      contracts: [],
      lots: [],
    });

    expect(stats.companies).toEqual({
      total: 0,
      producers: 0,
      buyers: 0,
      admins: 0,
      verifiedWallets: 0,
    });

    expect(stats.contracts).toEqual({
      total: 0,
      pending: 0,
      accepted: 0,
      revoked: 0,
    });

    expect(stats.lots).toEqual({
      total: 0,
      byStatus: {
        listed: 0,
        funded: 0,
        redeemed: 0,
        cancelled: 0,
        shipped: 0,
        refunded: 0,
        claimed: 0,
      },
      totalVolumeTonnes: 0,
      settledVolumeTonnes: 0,
      listedVolumeTonnes: 0,
      fundedVolumeTonnes: 0,
      totalValueUsdc: 0,
      settledValueUsdc: 0,
      escrowedValueUsdc: 0,
      estimatedProtocolFeesUsdc: 0,
    });
  });

  it("accurately calculates companies breakdown", () => {
    const stats = calculateProtocolStats({
      companies: [
        {
          company_type: "producer",
          wallet_address: "Prod111111111111111111111",
        },
        { company_type: "producer", wallet_address: null },
        { company_type: "buyer", wallet_address: "Buyer222222222222222222222" },
        { company_type: "admin", wallet_address: null },
      ],
      contracts: [],
      lots: [],
    });

    expect(stats.companies.total).toBe(4);
    expect(stats.companies.producers).toBe(2);
    expect(stats.companies.buyers).toBe(1);
    expect(stats.companies.admins).toBe(1);
    expect(stats.companies.verifiedWallets).toBe(2);
  });

  it("accurately calculates contracts breakdown", () => {
    const stats = calculateProtocolStats({
      companies: [],
      contracts: [
        { status: "pending" },
        { status: "accepted" },
        { status: "accepted" },
        { status: "revoked" },
      ],
      lots: [],
    });

    expect(stats.contracts.total).toBe(4);
    expect(stats.contracts.pending).toBe(1);
    expect(stats.contracts.accepted).toBe(2);
    expect(stats.contracts.revoked).toBe(1);
  });

  it("accurately calculates lots metrics, volumes, and protocol fees (1% take rate)", () => {
    const stats = calculateProtocolStats({
      companies: [],
      contracts: [],
      lots: [
        { status: "listed", volume_tonnes: 100, price_usdc: 150000 },
        { status: "funded", volume_tonnes: 50, price_usdc: 80000 },
        { status: "funded", volume_tonnes: 20, price_usdc: 30000 },
        { status: "redeemed", volume_tonnes: 200, price_usdc: 320000 },
        { status: "redeemed", volume_tonnes: 80, price_usdc: 120000 },
        { status: "cancelled", volume_tonnes: 40, price_usdc: 60000 },
      ],
    });

    expect(stats.lots.total).toBe(6);
    expect(stats.lots.byStatus.listed).toBe(1);
    expect(stats.lots.byStatus.funded).toBe(2);
    expect(stats.lots.byStatus.redeemed).toBe(2);
    expect(stats.lots.byStatus.cancelled).toBe(1);

    expect(stats.lots.totalVolumeTonnes).toBe(490);
    expect(stats.lots.settledVolumeTonnes).toBe(280); // 200 + 80
    expect(stats.lots.listedVolumeTonnes).toBe(100);
    expect(stats.lots.fundedVolumeTonnes).toBe(70); // 50 + 20

    expect(stats.lots.totalValueUsdc).toBe(760000);
    expect(stats.lots.settledValueUsdc).toBe(440000); // 320000 + 120000
    expect(stats.lots.escrowedValueUsdc).toBe(110000); // 80000 + 30000

    // 1% of 440000 is 4400
    expect(stats.lots.estimatedProtocolFeesUsdc).toBe(4400);
  });
});

describe("GET /api/admin/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(body.error).toBe("Iniciá sesión para ver las estadísticas.");
  });

  it("returns 403 when user is not admin", async () => {
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
      "Solo los administradores pueden acceder a las estadísticas del protocolo."
    );
  });

  it("returns 200 with aggregated stats when user is admin", async () => {
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
              data: { company_type: "admin" },
            }),
          }),
        }),
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "companies") {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { company_type: "producer", wallet_address: "w1" },
                { company_type: "admin", wallet_address: null },
              ],
            }),
          };
        }
        if (table === "company_contracts") {
          return {
            select: vi.fn().mockResolvedValue({
              data: [{ status: "accepted" }],
            }),
          };
        }
        if (table === "lots") {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { status: "redeemed", volume_tonnes: 10, price_usdc: 15000 },
              ],
            }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [] }) };
      }),
    } as unknown as ReturnType<typeof createServiceClient>);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.stats).toBeDefined();
    expect(body.stats.companies.total).toBe(2);
    expect(body.stats.companies.admins).toBe(1);
    expect(body.stats.companies.producers).toBe(1);
    expect(body.stats.contracts.accepted).toBe(1);
    expect(body.stats.lots.settledVolumeTonnes).toBe(10);
    expect(body.stats.lots.settledValueUsdc).toBe(15000);
    expect(body.stats.lots.estimatedProtocolFeesUsdc).toBe(150);
  });
});
