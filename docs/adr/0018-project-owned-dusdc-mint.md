# Demo settlement uses a project-owned dUSDC mint on Devnet

Settlement runs against a project-owned SPL mint (`dUSDC`, 6 decimals) created and distributed to demo wallets by the seed script, rather than Circle's Devnet USDC. This gives full control over demo liquidity with no faucet dependency.

The mint is a Config PDA value, so switching to real USDC on another cluster is configuration, not a program change. All surfaces must still state that demo tokens carry no real value.
