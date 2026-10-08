begin;

-- Buyer-confirmed settlement (ADR-0021): the producer timeout claim and the
-- legacy disputed state are removed. The lifecycle is now
-- listed -> funded -> redeemed, with cancelled only before funding. A funded
-- lot settles only when the designated buyer redeems it; escrowed USDC stays
-- locked if the buyer never confirms.

-- Demo data carrying removed statuses is discarded before the enum swap.
delete from public.lots where status in ('disputed', 'claimed');

-- Check constraints and the listed-catalogue partial index pin the old enum
-- type — detach them before the swap and re-create the survivors afterwards.
alter table public.lots
  drop constraint lots_funding_state_check,
  drop constraint lots_dispute_state_check,
  drop constraint lots_redeem_state_check,
  drop constraint lots_claim_state_check,
  drop constraint lots_cancel_state_check,
  alter column status drop default;
drop index public.lots_listed_catalog_idx;

create type public.lot_status_new as enum
  ('listed', 'funded', 'redeemed', 'cancelled');
alter table public.lots
  alter column status type public.lot_status_new
  using status::text::public.lot_status_new;
drop type public.lot_status;
alter type public.lot_status_new rename to lot_status;
alter table public.lots alter column status set default 'listed';

alter table public.lots
  drop column claimable_after,
  drop column claim_tx_signature,
  drop column dispute_tx_signature;

alter table public.lots
  add constraint lots_funding_state_check check (
    (status in ('funded', 'redeemed') and fund_tx_signature is not null)
    or (status in ('listed', 'cancelled') and fund_tx_signature is null)
  ),
  add constraint lots_redeem_state_check check (
    (status = 'redeemed' and redeem_tx_signature is not null)
    or (status <> 'redeemed' and redeem_tx_signature is null)
  ),
  add constraint lots_cancel_state_check check (
    (status = 'cancelled' and cancel_tx_signature is not null)
    or (status <> 'cancelled' and cancel_tx_signature is null)
  );

create index lots_listed_catalog_idx
  on public.lots (indexed_at desc, pda_address) where status = 'listed';

comment on column public.lots.mint_address is 'Digital Title mint; the NFT stays in the lot escrow until redeem or cancel burns it.';
comment on column public.lots.status is 'listed -> funded -> redeemed; cancelled only before funding. Buyer redemption is the only settlement path.';

commit;
