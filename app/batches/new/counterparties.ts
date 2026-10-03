// Demo counterparties until the authenticated contracts API exists:
// company_contracts is server-read only and joining company names requires
// the API (ADR-0003). These mirror "accepted contract" relationships.
export type Counterparty = { name: string; wallet: string };

export const DEMO_AUDITORS: Counterparty[] = [
  {
    name: "Laboratorio Andino de Certificaciones",
    wallet: "AuditAnd1noLabCert111111111111111111111111",
  },
  {
    name: "Puna SGS Ensayos",
    wallet: "LabCertPunaJujuy222222222222222222222222",
  },
];

export const DEMO_BUYERS: Counterparty[] = [
  {
    name: "Tesla Energy",
    wallet: "C1ienteTesaEnergy3333333333333333333333333",
  },
  {
    name: "BMW Group",
    wallet: "C1ienteBMWGroup44444444444444444444444444",
  },
];
