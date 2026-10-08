import { type Address, type Lamports } from "@solana/kit";
import { findAssociatedTokenAddress } from "./ata";
import type { SolanaClient } from "../solana-client";

export type TreasuryBalances = {
  treasury: Address;
  usdcAta: Address;
  sol: {
    lamports: Lamports | bigint;
    sol: number;
  };
  usdc: {
    rawAmount: string;
    uiAmount: number;
    decimals: number;
    uiAmountString: string;
  };
};

export type TreasuryRpc = SolanaClient["rpc"];

/**
 * Queries the on-chain SOL balance and USDC token account balance
 * for the protocol treasury address.
 */
export async function fetchTreasuryBalances(
  rpc: TreasuryRpc,
  options: { treasury: Address; usdcMint: Address }
): Promise<TreasuryBalances> {
  const [usdcAta] = await findAssociatedTokenAddress(
    options.treasury,
    options.usdcMint
  );

  const [solBalanceRes, usdcAccountRes] = await Promise.all([
    rpc.getBalance(options.treasury).send(),
    rpc.getAccountInfo(usdcAta, { encoding: "jsonParsed" }).send(),
  ]);

  const lamports = BigInt(solBalanceRes.value ?? 0n);
  const sol = Number(lamports) / 1_000_000_000;

  let rawAmount = "0";
  let uiAmount = 0;
  let decimals = 6;
  let uiAmountString = "0";

  if (usdcAccountRes?.value && "data" in usdcAccountRes.value) {
    const data = usdcAccountRes.value.data as {
      parsed?: {
        info?: {
          tokenAmount?: {
            amount?: string;
            uiAmount?: number;
            decimals?: number;
            uiAmountString?: string;
          };
        };
      };
    };
    const parsedAmount = data.parsed?.info?.tokenAmount;
    if (parsedAmount) {
      rawAmount = parsedAmount.amount ?? "0";
      uiAmount = Number(parsedAmount.uiAmount ?? 0);
      decimals = Number(parsedAmount.decimals ?? 6);
      uiAmountString =
        parsedAmount.uiAmountString ??
        parsedAmount.uiAmount?.toString() ??
        "0";
    }
  }

  return {
    treasury: options.treasury,
    usdcAta,
    sol: {
      lamports,
      sol,
    },
    usdc: {
      rawAmount,
      uiAmount,
      decimals,
      uiAmountString,
    },
  };
}
