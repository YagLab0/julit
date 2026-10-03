// Mirrors the seeded `origins` table (docs/database.md). Fetch from Supabase
// once a directory read is needed.
export const ORIGINS = [
  { id: "pena_blanca", name: "Salar de Peña Blanca" },
  { id: "condor", name: "Salar del Cóndor" },
] as const;

export type OriginId = (typeof ORIGINS)[number]["id"];

export function originName(id: string | null): string | null {
  return ORIGINS.find((o) => o.id === id)?.name ?? null;
}
