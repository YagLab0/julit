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

describe("GET /api/admin/origins", () => {
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

  it("returns 200 with list of origins for admin", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockAdminUser } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const mockOrigins = [
      {
        id: "pena_blanca",
        name: "Salar de Peña Blanca",
        code: "PBL",
        salar: "Salar de Peña Blanca",
        producer: "Sales del Altiplano S.A.",
        shareholders: "Altiplano Holding 60%",
        longitude: -66.70248,
        latitude: -23.46293,
        capacity_tpa: 42500,
        altitude_m: 3900,
        water_m3_per_tonne: 51.0,
        note: "Nota técnica",
        source_label: "Informe",
        source_url: "https://example.com",
      },
    ];

    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { company_type: "admin" } }),
          }),
          order: vi.fn().mockResolvedValue({
            data: mockOrigins,
            error: null,
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createServiceClient>);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.origins).toHaveLength(1);
    expect(body.origins[0].id).toBe("pena_blanca");
  });
});

describe("POST /api/admin/origins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid coordinates", async () => {
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

    const res = await POST(
      new Request("http://localhost/api/admin/origins", {
        method: "POST",
        body: JSON.stringify({
          name: "Salar de Pozuelos",
          code: "POZ",
          producer: "Pozuelos Corp",
          longitude: 250, // invalid: > 180
          latitude: -22.3,
          capacity_tpa: 25000,
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("longitud");
  });

  it("returns 409 when origin with code or name already exists", async () => {
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
          or: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "pena_blanca", code: "PBL", name: "Salar de Peña Blanca" },
            }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createServiceClient>);

    const res = await POST(
      new Request("http://localhost/api/admin/origins", {
        method: "POST",
        body: JSON.stringify({
          name: "Salar de Peña Blanca",
          code: "PBL",
          producer: "Minera Duplicada",
          longitude: -66.7,
          latitude: -23.4,
          capacity_tpa: 20000,
        }),
      })
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("Ya existe un salar");
  });

  it("creates origin successfully and returns 201", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockAdminUser } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const insertedOrigin = {
      id: "salar_de_pozuelos",
      name: "Salar de Pozuelos",
      code: "POZ",
      salar: "Salar de Pozuelos",
      producer: "Pozuelos Lithium S.A.",
      shareholders: "100% Capital Privado",
      longitude: -66.0,
      latitude: -22.5,
      capacity_tpa: 30000,
      altitude_m: 3750,
      water_m3_per_tonne: 45.2,
      note: "Salar de Pozuelos registrado en JuLit.",
      source_label: "Declaración Oficial",
      source_url: "https://julit.dev",
    };

    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { company_type: "admin" } }),
          }),
          or: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: insertedOrigin, error: null }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createServiceClient>);

    const res = await POST(
      new Request("http://localhost/api/admin/origins", {
        method: "POST",
        body: JSON.stringify({
          name: "Salar de Pozuelos",
          code: "POZ",
          producer: "Pozuelos Lithium S.A.",
          longitude: -66.0,
          latitude: -22.5,
          capacity_tpa: 30000,
          altitude_m: 3750,
          water_m3_per_tonne: 45.2,
        }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.origin.id).toBe("salar_de_pozuelos");
    expect(body.origin.code).toBe("POZ");
    expect(body.origin.capacity_tpa).toBe(30000);
  });
});
