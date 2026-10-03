// Mirrors the seeded `origins` table (docs/database.md). Fetch from Supabase
// once the authenticated API is wired.
export const ORIGINS = [
  { id: "olaroz", name: "Salar de Olaroz" },
  { id: "cauchari_olaroz", name: "Cauchari-Olaroz" },
] as const;
