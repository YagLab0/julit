import { type Address } from "@solana/kit";
import { fetchConfig, findConfigPda } from "../../generated/julit";

export type ProtocolConfig = {
  pda: Address;
  admin: Address;
  feeBps: number;
  usdcMint: Address;
  treasury: Address;
  bump: number;
};

/**
 * Reads the singleton Config PDA on Solana Devnet.
 */
export async function fetchProtocolConfig(
  rpc: Parameters<typeof fetchConfig>[0]
): Promise<ProtocolConfig> {
  const [pda] = await findConfigPda();
  const account = await fetchConfig(rpc, pda, { commitment: "confirmed" });
  return {
    pda,
    admin: account.data.admin,
    feeBps: account.data.feeBps,
    usdcMint: account.data.usdcMint,
    treasury: account.data.treasury,
    bump: account.data.bump,
  };
}
