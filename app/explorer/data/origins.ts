// Origin catalogue: real rows from the public Supabase `origins` table
// (anonymous SELECT under RLS). This is the demo's only origin source —
// there is no mock catalogue and no fallback.

export type Origin = {
  id: string;
  name: string;
  code: string;
  salar: string;
  producer: string;
  shareholders: string;
  /** [lng, lat] of the processing plant. */
  longitude: number;
  latitude: number;
  /** Tonnes per year of Li₂CO₃. */
  capacity_tpa: number;
  altitude_m: number | null;
  water_m3_per_tonne: number | null;
  note: string;
  source_label: string;
  source_url: string;
};

/** Columns the catalogue view needs, in one place for the page query. */
export const ORIGIN_COLUMNS =
  "id, name, code, salar, producer, shareholders, longitude, latitude, capacity_tpa, altitude_m, water_m3_per_tonne, note, source_label, source_url" as const;

/** [lng, lat] of the processing plant, for map placement. */
export function originCoordinates(origin: Origin): [number, number] {
  return [origin.longitude, origin.latitude];
}
