# Company accounts and API-controlled writes

Each company has one Supabase Auth account, without employee memberships or invitations. Wallet ownership must be proven by a signed message before linking a wallet to that company. Application data mutations, wallet linking, and certificate uploads go through the authenticated Next.js API rather than direct browser writes; the server verifies on-chain state before updating the public batch index. Supabase Auth grants application access, while Solana wallet signatures authorize blockchain operations; neither mechanism replaces the other.

A company has one type: producer, auditor, or buyer, and may link one verified wallet. Assigning an auditor or reserving a batch in the application requires a registered company of the corresponding type with a verified wallet. Public passport access does not require a company account.

Once a verified wallet is linked, its association with the company is fixed. Replacing it or transferring existing batch authority to another wallet is outside the agreed model.
