export const COMPANY_TYPES = ["producer", "buyer", "admin"] as const;

export type CompanyType = (typeof COMPANY_TYPES)[number];

/** Company types a visitor may self-register; producer and admin accounts are provisioned. */
export const SELF_SERVICE_COMPANY_TYPES: readonly CompanyType[] = ["buyer"];

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  producer: "Productor",
  buyer: "Comprador",
  admin: "Administrador",
};

export const COMPANY_TYPE_DESCRIPTIONS: Record<CompanyType, string> = {
  producer: "Extrae y declara lotes de carbonato de litio.",
  buyer: "Compra lotes reservados con liquidación en escrow.",
  admin:
    "Gestiona la tesorería del protocolo, comisiones y supervisión de lotes.",
};

export function isCompanyType(value: unknown): value is CompanyType {
  return COMPANY_TYPES.includes(value as CompanyType);
}

export function isAdmin(value: unknown): boolean {
  return value === "admin";
}
