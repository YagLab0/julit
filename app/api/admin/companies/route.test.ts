import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

vi.mock("../../../lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("../../../lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";

const mockAdminUser = {
  id: "a1a1a1a1-0000-4000-8000-000000000003",
  email: "admin@julit.dev",
  app_metadata: { role: "admin" },
};

const mockBuyerUser = {
  id: "a1a1a1a1-0000-4000-8000-000000000004",
  email: "comprador@julit.dev",
  app_metadata: {},
};

describe("GET /api/admin/companies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockBuyerUser } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { company_type: "buyer" } }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createServiceClient>);

    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 200 with list of companies when admin", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockAdminUser } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const mockCompanies = [
      {
        id: "comp-1",
        name: "Minera Cóndor S.A.",
        company_type: "producer",
        wallet_address: "4R2moXvPf1P72Kx65fAv461AHtbLXzkXRdDyX3JEDrvX",
        wallet_verified_at: "2026-10-07T00:00:00Z",
        origin_id: "condor",
        purity_pct: 99.6,
        water_footprint_m3_per_tonne: 50.0,
        carbon_footprint_kg_co2e_per_tonne: 9000,
        created_at: "2026-10-07T00:00:00Z",
      },
    ];

    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockImplementation((table) => {
        if (table === "companies") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { company_type: "admin" } }),
              }),
              order: vi.fn().mockResolvedValue({ data: mockCompanies, error: null }),
            }),
          };
        }
        return {};
      }),
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [{ id: "comp-1", email: "productor@condor.com" }] },
          }),
        },
      },
    } as unknown as ReturnType<typeof createServiceClient>);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.companies).toHaveLength(1);
    expect(body.companies[0].email).toBe("productor@condor.com");
  });
});

describe("POST /api/admin/companies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when company name is missing", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockAdminUser } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { company_type: "admin" } }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createServiceClient>);

    const req = new Request("http://localhost/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", company_type: "buyer", email: "test@buy.com" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("El nombre de la empresa es obligatorio.");
  });

  it("returns 400 when email is invalid", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockAdminUser } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { company_type: "admin" } }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createServiceClient>);

    const req = new Request("http://localhost/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Empresa Test", company_type: "buyer", email: "invalid-email" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Ingresá un correo electrónico válido.");
  });

  it("returns 400 when company_type is not buyer", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockAdminUser } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { company_type: "admin" } }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createServiceClient>);

    const req = new Request("http://localhost/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Minera Test",
        company_type: "producer",
        email: "producer@test.com",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("solo se cargan compradoras");
  });

  it("creates a buyer company successfully with 201", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockAdminUser } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const insertedCompany = {
      id: "new-user-123",
      name: "Tesla Inc.",
      company_type: "buyer",
      wallet_address: null,
      wallet_verified_at: null,
      origin_id: null,
      purity_pct: null,
      water_footprint_m3_per_tonne: null,
      carbon_footprint_kg_co2e_per_tonne: null,
      created_at: "2026-10-08T00:00:00Z",
    };

    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockImplementation((table) => {
        if (table === "companies") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { company_type: "admin" } }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: insertedCompany, error: null }),
              }),
            }),
          };
        }
        return {};
      }),
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: "new-user-123", email: "buyer@tesla.com" } },
            error: null,
          }),
        },
      },
    } as unknown as ReturnType<typeof createServiceClient>);

    const req = new Request("http://localhost/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Tesla Inc.",
        company_type: "buyer",
        email: "buyer@tesla.com",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.company.name).toBe("Tesla Inc.");
    expect(body.company.email).toBe("buyer@tesla.com");
  });
});
