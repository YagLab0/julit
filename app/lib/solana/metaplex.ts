import {
  address,
  getAddressEncoder,
  getBytesEncoder,
  getProgramDerivedAddress,
  type Address,
} from "@solana/kit";

/** Metaplex Token Metadata program (same id on every cluster). */
export const TOKEN_METADATA_PROGRAM_ADDRESS = address(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

const utf8 = (s: string) =>
  getBytesEncoder().encode(new TextEncoder().encode(s));

/** Metaplex metadata PDA: ["metadata", mpl_program, mint]. */
export function findMetadataPda(mint: Address) {
  return getProgramDerivedAddress({
    programAddress: TOKEN_METADATA_PROGRAM_ADDRESS,
    seeds: [
      utf8("metadata"),
      getAddressEncoder().encode(TOKEN_METADATA_PROGRAM_ADDRESS),
      getAddressEncoder().encode(mint),
    ],
  });
}

/** Metaplex master edition PDA: ["metadata", mpl_program, mint, "edition"]. */
export function findMasterEditionPda(mint: Address) {
  return getProgramDerivedAddress({
    programAddress: TOKEN_METADATA_PROGRAM_ADDRESS,
    seeds: [
      utf8("metadata"),
      getAddressEncoder().encode(TOKEN_METADATA_PROGRAM_ADDRESS),
      getAddressEncoder().encode(mint),
      utf8("edition"),
    ],
  });
}
