begin;

-- Symmetric escrow lifecycle with on-chain shipping evidence: the lifecycle
-- is now listed -> funded -> shipped -> redeemed|claimed, with refunded when
-- the producer never ships by ship_by and cancelled only before funding. The
-- protocol fee is frozen per lot at funding (lot.fee_bps).

-- Demo rows indexed under the old layout cannot backfill ship_by or
-- confirm_window_secs (both NOT NULL) — discard them before the enum swap,
-- exactly as the previous migration dropped removed-status rows.
delete from public.lots;

-- Check constraints and the listed-catalogue partial index pin the old enum
-- type — detach them before the swap and re-create the survivors afterwards.
alter table public.lots
  drop constraint lots_funding_state_check,
  drop constraint lots_redeem_state_check,
  drop constraint lots_cancel_state_check,
  alter column status drop default;
drop index public.lots_listed_catalog_idx;

create type public.lot_status_new as enum
  ('listed', 'funded', 'redeemed', 'cancelled', 'shipped', 'refunded', 'claimed');
alter table public.lots
  alter column status type public.lot_status_new
  using status::text::public.lot_status_new;
drop type public.lot_status;
alter type public.lot_status_new rename to lot_status;
alter table public.lots alter column status set default 'listed';

alter table public.lots
  add column ship_by timestamptz not null,
  add column confirm_window_secs integer not null
    check (confirm_window_secs between 60 and 7776000),
  add column fee_bps smallint check (fee_bps between 0 and 200),
  add column shipped_at timestamptz,
  add column bl_hash text check (bl_hash ~ '^[0-9a-f]{64}$'),
  add column ship_tx_signature text
    check (ship_tx_signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$'),
  add column refund_tx_signature text
    check (refund_tx_signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$'),
  add column claim_tx_signature text
    check (claim_tx_signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$');

alter table public.lots
  add constraint lots_funding_state_check check (
    (status in ('funded', 'shipped', 'redeemed', 'refunded', 'claimed')
      and fund_tx_signature is not null)
    or (status in ('listed', 'cancelled') and fund_tx_signature is null)
  ),
  add constraint lots_ship_state_check check (
    (shipped_at is not null and ship_tx_signature is not null
      and bl_hash is not null and status in ('shipped', 'redeemed', 'claimed'))
    or (shipped_at is null and ship_tx_signature is null and bl_hash is null
      and status <> 'shipped')
  ),
  add constraint lots_redeem_state_check check (
    (status = 'redeemed' and redeem_tx_signature is not null)
    or (status <> 'redeemed' and redeem_tx_signature is null)
  ),
  add constraint lots_refund_state_check check (
    (status = 'refunded' and refund_tx_signature is not null)
    or (status <> 'refunded' and refund_tx_signature is null)
  ),
  add constraint lots_claim_state_check check (
    (status = 'claimed' and claim_tx_signature is not null)
    or (status <> 'claimed' and claim_tx_signature is null)
  ),
  add constraint lots_cancel_state_check check (
    (status = 'cancelled' and cancel_tx_signature is not null)
    or (status <> 'cancelled' and cancel_tx_signature is null)
  );

create index lots_listed_catalog_idx
  on public.lots (indexed_at desc, pda_address) where status = 'listed';

comment on column public.lots.mint_address is 'Digital Title mint; the NFT stays in the lot escrow until redeem, refund, claim or cancel burns it.';
comment on column public.lots.status is 'listed -> funded -> shipped -> redeemed|claimed; refunded when the producer never ships by ship_by; cancelled only before funding.';
comment on column public.lots.ship_by is 'Deadline for the producer to post shipping evidence; after it the buyer may refund a funded, unshipped lot.';
comment on column public.lots.confirm_window_secs is 'Seconds the buyer has to confirm receipt after shipped_at before the producer may claim the escrow.';
comment on column public.lots.fee_bps is 'Protocol take rate frozen from Config at funding; null while the lot is unfunded.';
comment on column public.lots.shipped_at is 'Timestamp of mark_shipped; null until the producer posts shipping evidence.';
comment on column public.lots.bl_hash is 'SHA-256 hex of the bill of lading declared on-chain; null until shipped.';

commit;
