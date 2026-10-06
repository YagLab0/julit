import {
  AccountRole,
  address,
  getAddressEncoder,
  getProgramDerivedAddress,
  type Address,
  type Instruction,
} from "@solana/kit";

const ATA_PROGRAM = address("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const TOKEN_PROGRAM = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const SYSTEM_PROGRAM = address("11111111111111111111111111111111");

/** Associated token account address: [owner, token_program, mint]. */
export function findAssociatedTokenAddress(owner: Address, mint: Address) {
  return getProgramDerivedAddress({
    programAddress: ATA_PROGRAM,
    seeds: [
      getAddressEncoder().encode(owner),
      getAddressEncoder().encode(TOKEN_PROGRAM),
      getAddressEncoder().encode(mint),
    ],
  });
}

/** CreateIdempotent: creates the ATA when missing, no-ops when it exists. */
export function createAtaInstruction(
  payer: Address,
  ata: Address,
  owner: Address,
  mint: Address
): Instruction {
  return {
    programAddress: ATA_PROGRAM,
    accounts: [
      { address: payer, role: AccountRole.WRITABLE_SIGNER },
      { address: ata, role: AccountRole.WRITABLE },
      { address: owner, role: AccountRole.READONLY },
      { address: mint, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: TOKEN_PROGRAM, role: AccountRole.READONLY },
    ],
    data: new Uint8Array([1]),
  };
}
