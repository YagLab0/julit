# JuLit

**Safe payments for new lithium companies. A B2B directory and payment escrow for lithium carbonate lots on Solana.**

[![Solana Devnet](https://img.shields.io/badge/Solana-Devnet-14F195?logo=solana&logoColor=black)](https://explorer.solana.com/address/BntbtLZdHcHTai65uyXpKZyHaqX9kV68ZcfyyLBtXtky?cluster=devnet)
[![Program ID](https://img.shields.io/badge/Program_ID-BntbtLZd...Xtky-blueviolet)](https://explorer.solana.com/address/BntbtLZdHcHTai65uyXpKZyHaqX9kV68ZcfyyLBtXtky?cluster=devnet)
[![Anchor Version](https://img.shields.io/badge/Anchor-0.32.1-teal)](https://github.com/coral-xyz/anchor)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

The buyer pays only when the lithium arrives, and the producer knows the money is already there. JuLit locks the buyer's USDC in a Solana program and releases it to the producer when the buyer confirms delivery — or lets the buyer reclaim the full deposit if the lot never ships.

Pitch deck: [`public/pitch-en.html`](public/pitch-en.html) ([PDF](public/pitch-en.pdf)) · Spanish: [`public/pitch.html`](public/pitch.html) ([PDF](public/pitch.pdf)) · Script: [`public/pitch-script-en.pdf`](public/pitch-script-en.pdf)

---

## 1. The Problem

New lithium producers sell to buyers they don't know.

- **Big players sell to their own partners.** At Cauchari-Olaroz (Jujuy), the owners take the lithium in proportion to their shares.<sup>[1]</sup> There is no trust problem to solve.
- **New players carry the risk.** Argosy Minerals (Salta) sold 20 t of lithium carbonate to a Hong Kong buyer, who paid everything before the ship was loaded.<sup>[2]</sup>
- **Banks leave small companies out.** In 2022, SMEs sent 38% of trade finance requests but received 45% of the rejections.<sup>[3]</sup> A letter of credit is expensive and needs a lot of paperwork.<sup>[4]</sup> Of rejected SMEs that looked for other financing, 40% used their own money<sup>[5]</sup> — with no protection.

---

## 2. Who We Serve

| Segment                    | Fit         | Why                                                                     |
| -------------------------- | ----------- | ----------------------------------------------------------------------- |
| **New producers**          | Yes         | Selling their first lots to buyers who are not partners or shareholders |
| **Small buyers & traders** | Yes         | No bank credit line; today they must pay in advance to get the lithium  |
| **Big integrated groups**  | Not for now | They sell to their own shareholders and already trust their buyer       |

Buyers must operate where stablecoin payments are legal. Mainland China bans them,<sup>[6]</sup> so mainland buyers are out of scope.

---

## 3. The Solution

A payment box that opens only on delivery:

1. **Register** — We (the JuLit admin) register each producer with its production data, like lithium purity. Every lot from that producer uses the same data.
2. **Contract** — Producer and buyer sign a contract in JuLit. The producer creates a lot for that buyer (`create_lot`).
3. **Deposit** — The buyer puts the money, in USDC, into the box (`fund_lot`). The funds sit in a program-owned account and the program only releases them by its rules: to the producer on confirmation or timeout claim, or back to the buyer as a refund. The protocol fee is frozen into the lot at this point.
4. **Delivery** — The producer ships and records the hash of the shipping document on-chain (`mark_shipped`). The lithium arrives, the buyer checks it and confirms (`redeem_lot`). In that same transaction, the producer gets paid.
5. **Fallbacks** — If the producer never ships, the buyer takes a full refund after `ship_by` (`refund_lot`). If the buyer stays silent after shipping, the producer claims the payment once the confirm window expires (`claim_timeout`).

Yes, the buyer pays first. But without a bank, small buyers already pay first. With JuLit, that money is protected.

---

## 4. How It Works On-Chain

Each lot is a Program-Derived Address (PDA) that owns its USDC vault and a Digital Title token (Metaplex). The title never leaves the escrow; it is burned on every terminal transition (`redeem_lot`, `claim_timeout`, `refund_lot`, `cancel_lot`).

### Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Listed: create_lot\n(Producer lists a lot for one buyer)
    Listed --> Cancelled: cancel_lot\n(Producer cancels before funding)
    Listed --> Funded: fund_lot\n(Buyer deposits the full USDC price, before ship_by)
    Funded --> Shipped: mark_shipped\n(Producer records bl_hash, before ship_by)
    Funded --> Redeemed: redeem_lot\n(Buyer confirms: price − fee to producer, title burned)
    Shipped --> Redeemed: redeem_lot\n(Buyer confirms receipt)
    Funded --> Refunded: refund_lot\n(After ship_by, never shipped: full price back, no fee)
    Shipped --> Claimed: claim_timeout\n(After shipped_at + confirm_window_secs: price − fee to producer)
```

- `ship_by` (≤ 180 days ahead) and `confirm_window_secs` (60 s – 90 days) are commercial terms fixed at lot creation; the buyer accepts them by funding.
- `bl_hash` is the sha256 of the bill of lading / shipping document, recorded on-chain as shipping evidence.

### Deployed Program (Solana Devnet)

- **Program ID:** [`BntbtLZdHcHTai65uyXpKZyHaqX9kV68ZcfyyLBtXtky`](https://explorer.solana.com/address/BntbtLZdHcHTai65uyXpKZyHaqX9kV68ZcfyyLBtXtky?cluster=devnet)
- **Money:** a project-owned test USDC mint (dUSDC). No real funds.

### On-chain proof (devnet)

Real transactions from lot `DEMO-1` (11 Oct 2026), on the currently deployed program:

- **`fund_lot`** — the buyer deposits the lot price into the lot's program-owned vault: [`31Pheb9F…ZoYN`](https://explorer.solana.com/tx/31Pheb9Fz4jfQqLj2NmrtAaT9tiWRg2zGTjYKhzk65cDacGrrwKQ7mGxRzHdq7KGPjvk1dosrsgGGLap9ZhZ4oYN?cluster=devnet)
- **`redeem_lot`** — the buyer confirms delivery; in the same transaction the producer receives the price minus the 1% fee, the treasury receives the fee, and the Digital Title is burned: [`5K27ZsSL…fczU`](https://explorer.solana.com/tx/5K27ZsSLry3beSrCEzPyF63J1LFBugueDnsDg9MCQ3gt3rshvBbRTT8PPtRtrVSFGQSJ2RDwLY9cJ2GdVabjfczU?cluster=devnet)
- **Live app:** [ju-lit.vercel.app](https://ju-lit.vercel.app/) (Solana Devnet, Phantom or Solflare set to Devnet).

**Getting test dUSDC.** dUSDC is a project-owned test mint; only the JuLit admin can mint it. To try the buyer flow on the live app, ask the team for a demo account — we fund your Devnet wallet with test SOL and dUSDC by running:

```bash
node scripts/seed-devnet.mjs --wallet <your-devnet-wallet>
```

The script airdrops Devnet SOL, creates the wallet's dUSDC token account and mints a demo balance. It needs the admin keypair, so it only works for the team or for your own deployment of the program.

---

## 5. Why Solana

We use Solana because it is fast, and each transaction costs less than one cent.<sup>[7]</sup>

More important than cost: **the money is held by the program, not by us.** Each lot's USDC sits in a token account whose authority is the lot's PDA. The program has no admin instruction that moves deposited funds — the only exits are its rules (buyer confirmation, refund after `ship_by`, producer claim after the confirm window). The buyer trusts the published code, not JuLit. One caveat today: the program is upgradeable by a single key, so before mainnet we move the upgrade authority to a Squads multisig or freeze the program (see Known limits).

---

## 6. Business Model

We earn only when the payment is released.

- **1% fee**, charged only when the box releases the money to the producer. The fee is capped on-chain at `MAX_FEE_BPS` = 200 (2%); the current rate is 100 bps, stored in `Config` and set by the admin (`set_fee_bps`). The fee is frozen into each lot when the buyer funds it (`lot.fee_bps`), so later admin changes never affect funded lots.
- **Creating a lot and depositing are free.**
- **Why they pay:** the producer ships knowing the money is already locked; the buyer's money is protected until delivery.

We don't replace bank credit. We give a safe option to the companies that can't get it.

### Unit economics (illustrative)

| Option today                                    | What the buyer pays                                             | What protects the buyer                                               |
| ----------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Prepayment** (current practice<sup>[2]</sup>) | 100% before loading, no fee                                     | Nothing — the money is already with the producer                      |
| **Letter of credit**                            | Bank fees and paperwork<sup>[4]</sup>; needs a bank credit line | Payment against documents, if the bank approves the SME<sup>[3]</sup> |
| **JuLit escrow**                                | 100% into escrow + 1% only on release                           | Funds locked until confirmation; refund if never shipped              |

The fee scales linearly with lot value: for every US$100,000 settled, JuLit earns US$1,000. Lot prices are usually not public — the Argosy 20 t sale, for example, used a fixed price referenced from the SMM battery-grade lithium carbonate index without disclosing it<sup>[2]</sup> — so we do not quote a per-lot figure.

We have not yet validated the 1% fee with producers or traders. Our next step is to show the Devnet flow to new producers and traders in Jujuy, Salta and Catamarca, record their feedback, and run a first pilot lot.

---

## 7. Status & Limits

- **Live on Devnet:** the full lot lifecycle — list, fund, shipping evidence (`mark_shipped`), buyer confirmation, `refund_lot` and `claim_timeout` — is deployed on Solana Devnet with test money.
- **Tested:** the Anchor program is tested with LiteSVM, and the app with Vitest.

### Known limits

- **Disputes are off-chain.** Quality or quantity disputes are not resolved on-chain: after shipping, the buyer can only confirm or let the confirm window expire. Disputes fall to the off-chain commercial contract; a multisig arbiter (Squads) is on the roadmap.
- **Lot metrics are producer-declared.** Purity, water and carbon metrics and the spec sheet are declared by the producer; the program only range-checks purity. Lab attestation (e.g. Solana Attestation Service) is on the roadmap.
- **`bl_hash` proves commitment, not authenticity.** It proves which shipping document the producer committed to, not that the document is genuine.
- **Test money only.** Settlement uses a project-owned test mint (dUSDC) on devnet; no real funds move. Mainnet would configure Circle USDC in `Config`.
- **Single-key admin today.** Admin, treasury and program upgrade authority are single keys; moving them to a Squads multisig is planned before mainnet. `initialize` is not yet restricted to the upgrade authority (the devnet `Config` is already initialized).
- **Regulatory review pending.** Settlement in USDC must be coordinated with Argentine export FX rules (Decreto 609/2019, BCRA); legal review pending.

### Threat model: the off-spec lot

**Scenario.** The producer records a `bl_hash` and ships, but the lithium arrives below the contracted grade — or the shipping document is not genuine.

- **What the program does today.** Once `mark_shipped` is recorded, `refund_lot` is no longer available. The buyer can confirm (`redeem_lot`) or stay silent; after `confirm_window_secs` the producer can `claim_timeout`. The program cannot see the lithium.
- **What protects the buyer today.** Quality is governed by the off-chain commercial contract between producer and buyer, not by JuLit. A long enough `confirm_window_secs` gives the buyer time to inspect before the producer can claim. The current JuLit contract template does not yet include an assay or arbitration clause.
- **What we build next.**
  1. An independent destination-assay and arbitration clause in the JuLit contract template.
  2. A `Disputed` state the buyer can open inside the confirm window, freezing the escrow.
  3. Resolution by a multisig arbiter (Squads) named in `Config`, with LiteSVM tests for out-of-window disputes, non-arbiter resolution and double resolution.
  4. Two-stage settlement, the way lithium is priced: an advance against the bill of lading and the balance against a lab assay at destination, signed through Solana Attestation Service.

---

## 8. The Team

Built in **San Salvador de Jujuy, Argentina**, inside the Lithium Triangle — close to the new producers we want to help.

- **Mauricio Rios** — Team Lead · Solana | [LinkedIn](https://www.linkedin.com/in/rios-mauricio) | [GitHub](https://github.com/RiosMauricio)
- **Mauro Benjamin Mamani** — Frontend | [LinkedIn](https://www.linkedin.com/in/mauromamani/) | [GitHub](https://github.com/mauromamani)
- **Mayko Fernandez** — Protocol · QA | [LinkedIn](https://www.linkedin.com/in/Mayko2003) | [GitHub](https://github.com/Mayko2003)
- **Samuel Paredes** — Full-Stack | [LinkedIn](https://www.linkedin.com/in/samas-dev/) | [GitHub](https://github.com/Samas1503)

---

## 9. Technology Stack

| Layer                   | Technology                                                 |
| ----------------------- | ---------------------------------------------------------- |
| **Smart Contracts**     | Anchor `0.32.1`, Rust 2021, Solana SDK v2                  |
| **Testing**             | LiteSVM (`litesvm 0.7.1`), Vitest (`v3.2.4`)               |
| **Token Standards**     | SPL Token, Metaplex Token Metadata V3                      |
| **Frontend**            | Next.js 16 (App Router), React 19, TypeScript              |
| **Web3 Client**         | `@solana/kit`, Wallet Standard (Phantom, Solflare), Codama |
| **Styling & 3D**        | Tailwind CSS v4, Three.js (`@react-three/fiber`)           |
| **Database & Indexing** | Supabase (PostgreSQL with Row Level Security, Storage)     |

---

## 10. Quickstart

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+) and [pnpm](https://pnpm.io/) (v10+)
- [Rust](https://rustup.rs/) (stable) & [Solana CLI](https://docs.solanalabs.com/cli/install) (v2.0+)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) (v0.32.1)

### Setup & Run

1. **Clone the repository:**

   ```bash
   git clone https://github.com/YagLab0/julit.git
   cd julit
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Configure environment** — create `.env.local` with your Supabase project values:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SECRET_KEY=...
   ```

4. **Run the local development server:**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) for the landing page, or [http://localhost:3000/explorer](http://localhost:3000/explorer) for the producer and lot explorer.

5. **Run the tests:**
   - **App tests (Vitest):**
     ```bash
     pnpm test
     ```
   - **Anchor program tests (LiteSVM):**
     ```bash
     pnpm anchor-test
     ```

### Demo accounts

[`supabase/seed.sql`](supabase/seed.sql) creates these demo accounts — same password for all: `julit-demo-2026`.

| Email                                 | Password          | Role     | Company                  |
| ------------------------------------- | ----------------- | -------- | ------------------------ |
| `productor.olaroz@julit.dev`          | `julit-demo-2026` | Producer | Sales del Altiplano S.A. |
| `productor.cauchari-olaroz@julit.dev` | `julit-demo-2026` | Producer | Minera Cóndor S.A.       |
| `admin@julit.dev`                     | `julit-demo-2026` | Admin    | JuLit Protocol Admin     |
| `comprador@julit.dev`                 | `julit-demo-2026` | Buyer    | Comprador Demo           |

They are applied locally by `supabase db reset` (or `node scripts/seed-local.mjs`) and to the linked project by `supabase db push --include-seed`.

---

## 11. Repository Structure

```
├── anchor/
│   ├── programs/julit/src/lib.rs    # Anchor program (escrow, PDAs, Digital Title)
│   └── programs/julit/tests/        # LiteSVM lot lifecycle tests
├── app/
│   ├── explorer/                    # B2B directory, origin map, and lot creation
│   ├── batch/[pda]/                 # Public lot page
│   ├── account/                     # Producer and buyer lot actions
│   ├── api/lots/                    # Lot index transitions (fund, ship, redeem, refund, claim, cancel)
│   ├── generated/julit/             # Codama-generated TypeScript client from the Anchor IDL
│   └── landing/                     # Landing page
├── public/
│   ├── pitch.html / .pdf            # Spanish pitch deck
│   ├── pitch-en.html / .pdf         # English pitch deck
│   └── pitch-script-en.html / .pdf  # English pitch script
├── scripts/                         # Devnet and local seeding
└── supabase/
    └── migrations/                  # PostgreSQL schema, RLS policies, and lot indexing
```

---

## 12. Sources

1. Lithium Argentina AG, Exhibit 99.1 filed with the SEC (2026) — Cauchari-Olaroz: 44.8% Lithium Argentina, 46.7% Ganfeng, 8.5% JEMSE; "Both parties are entitled to offtake in proportion to their ownership interests." [sec.gov](https://www.sec.gov/Archives/edgar/data/1440972/000106299326004563/exhibit99-1.htm)
2. Argosy Minerals (ASX: AGY), _Lithium Carbonate Spot Sales Contract_, March 2025 — 20 t to a Hong Kong based chemical company, FOB Buenos Aires, "requiring a 30% deposit and the 70% balance required prior to ship loading"; "fixed price was referenced from SMM battery grade lithium carbonate price" (price not disclosed). [argosyminerals.com.au](https://www.argosyminerals.com.au/wp-content/uploads/2025/03/2861224.pdf)
3. Asian Development Bank, _2023 Trade Finance Gaps, Growth, and Jobs Survey_ (Brief 256) — in 2022, SMEs submitted 38% of applications and received 45% of rejections. [adb.org](https://www.adb.org/sites/default/files/publication/906596/adb-brief-256-2023-trade-finance-gaps-growth-jobs-survey.pdf)
4. U.S. International Trade Administration, _Letter of Credit_ — "labor-intensive and relatively expensive due to bank fees"; documents "prone to errors and discrepancies". [trade.gov](https://www.trade.gov/letter-credit)
5. Asian Development Bank, _2021 Trade Finance Gaps, Growth, and Jobs Survey_ (Brief 192) — "Among SMEs who were initially rejected and sought alternative financing, 40% used their own funds." [adb.org](https://www.adb.org/sites/default/files/publication/739286/adb-brief-192-trade-finance-gaps-jobs-survey.pdf)
6. People's Bank of China and seven other authorities, Notice Yin Fa [2026] No. 42 (6 February 2026) — virtual currency business activities, including stablecoins, are illegal financial activities in mainland China. [pbc.gov.cn](https://www.pbc.gov.cn/tiaofasi/144941/3581332/2026020619591971323/index.html)
7. Solana Docs, _Fees_ — base fee of 5,000 lamports (0.000005 SOL) per signature; under one US cent at any SOL price below $2,000. [solana.com](https://solana.com/docs/core/fees)
