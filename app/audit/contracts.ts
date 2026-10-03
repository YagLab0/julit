import { createServiceClient } from "../lib/supabase/service";

export type ContractStatus = "pending" | "accepted" | "revoked";

export type ContractOffer = {
  id: string;
  producerName: string;
  producerWallet: string | null;
  status: ContractStatus;
};

type ContractRow = {
  id: string;
  status: ContractStatus;
  producer: { name: string; wallet_address: string | null };
};

/**
 * Server-side read of the contracts where the company is the counterparty.
 * Producer names and wallets come from `companies`, which browsers cannot
 * read (ADR-0003), so this joins through the service role. Responses go
 * through POST /api/companies/contracts/[id]/respond.
 */
export async function loadAuditorContracts(
  counterpartyId: string
): Promise<ContractOffer[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("company_contracts")
    .select("id, status, producer:companies!producer_id(name, wallet_address)")
    .eq("counterparty_id", counterpartyId)
    .order("created_at", { ascending: false })
    .returns<ContractRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    producerName: row.producer.name,
    producerWallet: row.producer.wallet_address,
  }));
}
