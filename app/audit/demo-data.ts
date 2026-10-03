// Demo data until the index (batch-registration issue 06) and the contracts
// API (issue 03) exist: the assigned-batch list is a SELECT over `batches`
// filtered by auditor_wallet, and company names come from the API directory —
// neither is readable from the browser today (ADR-0003). Certifications
// mutate this in-memory store; a full reload resets the demo.
export type EuAssessment = "conformant" | "non_conformant";

export type DemoBatch = {
  pdaAddress: string;
  batchId: string;
  producerName: string;
  producerWallet: string;
  originName: string;
  volumeTonnes: number;
  purityPct: number;
  waterM3PerTonne: number;
  carbonKgCo2ePerTonne: number;
  priceUsdc: number;
  status: "created" | "audited";
  esgApproved?: boolean;
  euAssessment?: EuAssessment;
  auditSha256?: string;
};

export type ContractStatus = "pending" | "accepted" | "revoked";

export type DemoContractOffer = {
  id: string;
  producerName: string;
  producerWallet: string;
  status: ContractStatus;
};

export const demoBatches: DemoBatch[] = [
  {
    pdaAddress: "BatchPdaOlaroz1111111111111111111111111111",
    batchId: "LIT-2026-EXAR-02",
    producerName: "Sales de Jujuy",
    producerWallet: "ProdSalesdeJujuy1111111111111111111111111",
    originName: "Olaroz",
    volumeTonnes: 100,
    purityPct: 99.52,
    waterM3PerTonne: 125.5,
    carbonKgCo2ePerTonne: 450.25,
    priceUsdc: 12000.123456,
    status: "created",
  },
  {
    pdaAddress: "BatchPdaCauchari222222222222222222222222222",
    batchId: "LIT-2026-CAUC-07",
    producerName: "Minera Exar",
    producerWallet: "ProdMineraExar22222222222222222222222222",
    originName: "Cauchari-Olaroz",
    volumeTonnes: 420,
    purityPct: 99.55,
    waterM3PerTonne: 50.8,
    carbonKgCo2ePerTonne: 8200.0,
    priceUsdc: 51000.5,
    status: "created",
  },
  {
    pdaAddress: "BatchPdaAuditado333333333333333333333333333",
    batchId: "LIT-2026-EXAR-01",
    producerName: "Sales de Jujuy",
    producerWallet: "ProdSalesdeJujuy1111111111111111111111111",
    originName: "Olaroz",
    volumeTonnes: 80,
    purityPct: 99.61,
    waterM3PerTonne: 118.2,
    carbonKgCo2ePerTonne: 410.75,
    priceUsdc: 9800.0,
    status: "audited",
    esgApproved: false,
    euAssessment: "non_conformant",
    auditSha256:
      "3a7bd3e2360a4d8b1f2c9e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b",
  },
];

export const demoContractOffers: DemoContractOffer[] = [
  {
    id: "offer-1",
    producerName: "Sales de Jujuy",
    producerWallet: "ProdSalesdeJujuy1111111111111111111111111",
    status: "pending",
  },
  {
    id: "offer-2",
    producerName: "Minera Exar",
    producerWallet: "ProdMineraExar22222222222222222222222222",
    status: "accepted",
  },
  {
    id: "offer-3",
    producerName: "Lithium Americas",
    producerWallet: "ProdLithiumAmericas3333333333333333333333",
    status: "revoked",
  },
];
