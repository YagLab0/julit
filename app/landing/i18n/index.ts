import { es } from "./es";
import { en } from "./en";

export type LandingDict = typeof es;
export type LandingLocale = "es" | "en";

export const LANDING_LOCALES: Record<LandingLocale, LandingDict> = { es, en };
