export const COMPANY_TYPES = ["producer", "buyer"] as const;

export type CompanyType = (typeof COMPANY_TYPES)[number];

/** Company types a visitor may self-register; producer accounts are provisioned. */
export const SELF_SERVICE_COMPANY_TYPES: readonly CompanyType[] = ["buyer"];

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  producer: "Productor",
  buyer: "Comprador",
};

export const COMPANY_TYPE_DESCRIPTIONS: Record<CompanyType, string> = {
  producer: "Extrae y declara lotes de carbonato de litio.",
  buyer: "Compra lotes reservados con liquidación en escrow.",
};

export function isCompanyType(value: unknown): value is CompanyType {
  return COMPANY_TYPES.includes(value as CompanyType);
}
