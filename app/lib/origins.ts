// Mirrors the seeded `origins` table (docs/database.md). Fetch from Supabase
// once a directory read is needed.
export const ORIGINS = [
  { id: "olaroz", name: "Salar de Olaroz" },
  { id: "cauchari_olaroz", name: "Cauchari-Olaroz" },
] as const;

export type OriginId = (typeof ORIGINS)[number]["id"];

export function originName(id: string | null): string | null {
  return ORIGINS.find((o) => o.id === id)?.name ?? null;
}
