import {
  address,
  type Address,
  type Instruction,
  AccountRole,
} from "@solana/kit";

export const MEMO_PROGRAM_ADDRESS = address(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

/**
 * Builds an instruction for the Solana SPL Memo program v2.
 * Notarizes canonical text directly onto the Solana ledger into an on-chain block.
 */
export function createMemoInstruction(
  memo: string,
  signerAddress?: Address
): Instruction {
  return {
    programAddress: MEMO_PROGRAM_ADDRESS,
    accounts: signerAddress
      ? [{ address: signerAddress, role: AccountRole.READONLY_SIGNER }]
      : [],
    data: new TextEncoder().encode(memo),
  };
}
