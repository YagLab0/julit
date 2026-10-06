# The lot's digital title is a Metaplex NFT; the Lot PDA carries the lifecycle

A lot's transferable digital title is a real Metaplex Token Standard `NonFungible` (supply 1): the program creates mint, metadata, and master edition via CPI at `create_lot`, with the Lot PDA as update authority, and holds the token in a program-owned escrow ATA until settlement. The Lot PDA carries the lifecycle `Listed → Settled → Redeemed`; `redeem_lot` burns the NFT when the buyer confirms physical delivery, leaving a permanent on-chain trail of mint, payment, transfer, and redemption.

A bare SPL mint was rejected: metadata and master edition give the title a standard, wallet-visible identity. The NFT represents a contractual right over the lot; it is not automatic legal title, and public surfaces must not claim otherwise.
