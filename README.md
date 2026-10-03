# julit

Empty Solana dApp starter: Next.js + `@solana/kit` frontend with wallet connection ready, no demo program. Create your Anchor program in `anchor/programs/` and build the app on top.

## Stack

| Layer          | Technology                       |
| -------------- | -------------------------------- |
| Frontend       | Next.js 16, React 19, TypeScript |
| Styling        | Tailwind CSS v4                  |
| Solana Client  | `@solana/kit`, wallet-standard   |
| Program Client | Codama (generated from IDL)      |
| Program        | Anchor (Rust)                    |
| Network        | Solana Devnet                    |
| Database       | Supabase (`@supabase/ssr`)       |

## Requirements

- Node 20+
- [Rust](https://rustup.rs/), [Solana CLI](https://solana.com/docs/intro/installation), [Anchor 1.x](https://www.anchor-lang.com/docs/installation)
- Phantom or Solflare wallet on Devnet

## Commands

```shell
pnpm install      # dependencies
pnpm dev          # dApp at http://localhost:3000
pnpm build        # production build
pnpm lint         # eslint
pnpm format       # prettier
pnpm setup        # anchor build + generate TS client with Codama
pnpm anchor-test  # program tests (LiteSVM)
```

> `pnpm setup` and `pnpm anchor-test` require an Anchor program in
> `anchor/programs/`. If none exists, create one first (`anchor init` or manually),
> set `declare_id!` with `anchor keys sync`, then run `setup`.

## Environment

```shell
cp .env.example .env.local   # then fill in your Supabase project values
```

Supabase clients live in `app/lib/supabase/` (`client.ts` for browser,
`server.ts` for Server Components/Actions, `service.ts` for server-only API
writes). `SUPABASE_SECRET_KEY` (Project Settings -> API keys) is required for
the API route handlers and must never reach the browser.

## Database

Lithium Passport migrations define company accounts, the public Devnet batch index,
and the public audit PDF bucket. They do not implement the application API or Anchor
programme. See [the database contract](docs/database.md), [domain glossary](GLOSSARY.md),
and [architecture decisions](docs/adr/).

With Docker and the Supabase CLI installed:

```shell
supabase start
supabase migration up --local
supabase migration list --local
supabase test db
supabase db advisors --local --level warn --fail-on warn
```

`supabase db reset --local` deletes local data and replays all migrations. Use it only
in a disposable database.

These migrations are already applied to the linked project `sixusybflhwjtoikrecn`
(`JuLit`). Remote deployment requires an explicit, separately reviewed database push;
start with `supabase db push --dry-run --linked` to see exactly what would be applied.

## Structure

```
├── app/
│   ├── components/         # UI: wallet, cluster, theme, providers
│   ├── generated/          # Codama-generated TS client (do not edit)
│   ├── lib/
│   │   ├── wallet/         # wallet-standard connection (Phantom/Solflare)
│   │   ├── hooks/          # use-balance, use-send-transaction
│   │   ├── solana-client*  # RPC client + context
│   │   ├── errors.ts       # transaction error parsing
│   │   └── explorer.ts     # Solana Explorer URLs per cluster
│   ├── layout.tsx
│   └── page.tsx
├── anchor/
│   └── programs/           # Anchor program (Rust)
├── supabase/
│   ├── migrations/         # Company accounts, batch index, and PDF storage
│   └── tests/database/     # pgTAP behavior and access-control regressions
└── codama.json             # IDL → TypeScript client
```

## Codama

`codama.json` points to `./anchor/target/idl/julit.json` and generates
`./app/generated/julit`. If your program is named differently, update both
paths.
