export const COMPANY_TYPES = ["producer", "auditor", "buyer"] as const;

export type CompanyType = (typeof COMPANY_TYPES)[number];

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  producer: "Productor",
  auditor: "Auditor",
  buyer: "Comprador",
};

export const COMPANY_TYPE_DESCRIPTIONS: Record<CompanyType, string> = {
  producer: "Extrae y declara lotes de carbonato de litio.",
  auditor: "Certifica lotes con análisis químico y evidencia ambiental.",
  buyer: "Compra lotes reservados o del mercado spot.",
};

export function isCompanyType(value: unknown): value is CompanyType {
  return COMPANY_TYPES.includes(value as CompanyType);
}
