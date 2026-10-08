use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount};
use mpl_token_metadata::instructions::{
    CreateMasterEditionV3CpiBuilder, CreateMetadataAccountV3CpiBuilder,
};
use mpl_token_metadata::types::{Creator, DataV2};

declare_id!("BntbtLZdHcHTai65uyXpKZyHaqX9kV68ZcfyyLBtXtky");

pub const MAX_LOT_ID_BYTES: usize = 32;
pub const MAX_ORIGIN_ID_BYTES: usize = 32;
pub const MAX_URI_BYTES: usize = 200;

#[program]
pub mod julit {
    use super::*;

    /// Creates the protocol Config PDA. Admin is the signer; `usdc_mint` is a
    /// parameter so devnet dUSDC and mainnet USDC differ only by config.
    /// `claim_min_secs`/`claim_max_secs` bound the per-lot `claimable_after`
    /// window declared at `create_lot`.
    pub fn initialize(
        ctx: Context<Initialize>,
        fee_bps: u16,
        usdc_mint: Pubkey,
        treasury: Pubkey,
        claim_min_secs: i64,
        claim_max_secs: i64,
    ) -> Result<()> {
        require!(fee_bps <= 10_000, LotError::InvalidFeeBps);
        require!(
            claim_min_secs > 0 && claim_min_secs < claim_max_secs,
            LotError::InvalidClaimWindow
        );
        require!(treasury != Pubkey::default(), LotError::InvalidTreasury);

        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.fee_bps = fee_bps;
        config.usdc_mint = usdc_mint;
        config.treasury = treasury;
        config.claim_min_secs = claim_min_secs;
        config.claim_max_secs = claim_max_secs;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    /// Updates the protocol take rate. Only the Config admin may call it; the
    /// fee is read at settlement, so it applies to every future Redemption and
    /// Timeout Claim regardless of when the lot was created or funded.
    pub fn set_fee_bps(ctx: Context<UpdateConfig>, fee_bps: u16) -> Result<()> {
        require!(fee_bps <= 10_000, LotError::InvalidFeeBps);
        ctx.accounts.config.fee_bps = fee_bps;
        Ok(())
    }

    /// Registers a lot and mints its Digital Title into escrow. The title is a
    /// Metaplex NonFungible whose update authority is the Lot PDA; it never
    /// leaves the escrow — it is burned there by `redeem_lot` or
    /// `claim_timeout`, so transfer-in-transit is impossible by construction.
    ///
    /// Metrics arrive pre-scaled: purity in basis points, water/carbon x100,
    /// price in USDC base units (6 decimals).
    pub fn create_lot(
        ctx: Context<CreateLot>,
        lot_id: String,
        origin_id: String,
        volume_tonnes: u64,
        purity_basis_points: u64,
        water_m3_per_tonne_scaled: u64,
        carbon_kg_co2e_per_tonne_scaled: u64,
        price_usdc: u64,
        buyer: Pubkey,
        claimable_after: i64,
        spec_sheet_hash: [u8; 32],
        metadata_uri: String,
    ) -> Result<()> {
        require!(
            !lot_id.is_empty() && lot_id.len() <= MAX_LOT_ID_BYTES,
            LotError::InvalidLotId
        );
        require!(
            !origin_id.is_empty() && origin_id.len() <= MAX_ORIGIN_ID_BYTES,
            LotError::InvalidOriginId
        );
        require!(volume_tonnes >= 1, LotError::InvalidVolume);
        require!(
            (9_950..=10_000).contains(&purity_basis_points),
            LotError::NotBatteryGrade
        );
        require!(price_usdc > 0, LotError::InvalidPrice);
        require!(
            buyer != ctx.accounts.producer.key(),
            LotError::BuyerIsProducer
        );
        require!(
            metadata_uri.len() <= MAX_URI_BYTES,
            LotError::MetadataUriTooLong
        );

        let config = &ctx.accounts.config;
        let now = Clock::get()?.unix_timestamp;
        let window = claimable_after
            .checked_sub(now)
            .ok_or(LotError::ClaimWindowOutOfBounds)?;
        require!(
            window >= config.claim_min_secs && window <= config.claim_max_secs,
            LotError::ClaimWindowOutOfBounds
        );

        let lot = &mut ctx.accounts.lot;
        lot.lot_id = lot_id.clone();
        lot.origin_id = origin_id;
        lot.producer = ctx.accounts.producer.key();
        lot.buyer = buyer;
        lot.mint = ctx.accounts.mint.key();
        lot.volume_tonnes = volume_tonnes;
        lot.purity_basis_points = purity_basis_points;
        lot.water_m3_per_tonne_scaled = water_m3_per_tonne_scaled;
        lot.carbon_kg_co2e_per_tonne_scaled = carbon_kg_co2e_per_tonne_scaled;
        lot.price_usdc = price_usdc;
        lot.claimable_after = claimable_after;
        lot.spec_sheet_hash = spec_sheet_hash;
        lot.status = LotStatus::Listed;
        lot.created_at = now;
        lot.bump = ctx.bumps.lot;

        let lot_key = lot.key();
        let producer_key = ctx.accounts.producer.key();
        let lot_seeds: &[&[u8]] = &[
            b"lot",
            producer_key.as_ref(),
            lot_id.as_bytes(),
            &[lot.bump],
        ];
        let signer = &[lot_seeds];

        // Mint exactly one token of the Digital Title into the escrow ATA.
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.escrow_title.to_account_info(),
                    authority: lot.to_account_info(),
                },
                signer,
            ),
            1,
        )?;

        // Metaplex metadata + master edition, both signed by the Lot PDA as
        // mint and update authority.
        CreateMetadataAccountV3CpiBuilder::new(
            &ctx.accounts.token_metadata_program.to_account_info(),
        )
        .metadata(&ctx.accounts.metadata.to_account_info())
        .mint(&ctx.accounts.mint.to_account_info())
        .mint_authority(&lot.to_account_info())
        .payer(&ctx.accounts.producer.to_account_info())
        .update_authority(&lot.to_account_info(), true)
        .system_program(&ctx.accounts.system_program.to_account_info())
        .rent(Some(&ctx.accounts.rent.to_account_info()))
        .data(DataV2 {
            name: format!("JULIT LOT {}", lot_id),
            symbol: "JLOT".to_string(),
            uri: metadata_uri,
            seller_fee_basis_points: 0,
            creators: Some(vec![Creator {
                address: lot_key,
                verified: false,
                share: 100,
            }]),
            collection: None,
            uses: None,
        })
        .is_mutable(false)
        .invoke_signed(signer)?;

        CreateMasterEditionV3CpiBuilder::new(
            &ctx.accounts.token_metadata_program.to_account_info(),
        )
        .edition(&ctx.accounts.master_edition.to_account_info())
        .mint(&ctx.accounts.mint.to_account_info())
        .update_authority(&lot.to_account_info())
        .mint_authority(&lot.to_account_info())
        .payer(&ctx.accounts.producer.to_account_info())
        .metadata(&ctx.accounts.metadata.to_account_info())
        .token_program(&ctx.accounts.token_program.to_account_info())
        .system_program(&ctx.accounts.system_program.to_account_info())
        .rent(Some(&ctx.accounts.rent.to_account_info()))
        .max_supply(0)
        .invoke_signed(signer)?;

        Ok(())
    }

    /// The designated buyer deposits exactly the lot's `price_usdc` into the
    /// lot-owned escrow. The funds stay locked until `redeem_lot` releases
    /// them to the producer or `claim_timeout` returns control of the claim
    /// to the producer. Only the buyer recorded at creation may sign, and
    /// only a `Listed` lot accepts funding — double funding is impossible.
    pub fn fund_lot(ctx: Context<FundLot>) -> Result<()> {
        let lot = &mut ctx.accounts.lot;
        require!(lot.status == LotStatus::Listed, LotError::LotNotListed);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.buyer_usdc.to_account_info(),
                    to: ctx.accounts.escrow_usdc.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            lot.price_usdc,
        )?;

        lot.status = LotStatus::Funded;
        Ok(())
    }

    /// The buyer confirms physical receipt. Atomically burns the Digital
    /// Title inside escrow, releases the escrowed USDC to the producer minus
    /// the take rate, and pays the treasury its fee. Callable from `Funded`
    /// and `Disputed` — the buyer's release is the on-chain shape of an
    /// off-chain resolution in the producer's favor.
    pub fn redeem_lot(ctx: Context<RedeemLot>) -> Result<()> {
        let lot_info = ctx.accounts.lot.to_account_info();
        let lot = &mut ctx.accounts.lot;
        require!(
            lot.status == LotStatus::Funded || lot.status == LotStatus::Disputed,
            LotError::LotNotFunded
        );
        let price = lot.price_usdc;
        let producer_key = lot.producer;
        let lot_id_bytes = lot.lot_id.as_bytes().to_vec();
        let bump = [lot.bump];
        let signer_seeds: &[&[u8]] = &[
            b"lot",
            producer_key.as_ref(),
            lot_id_bytes.as_slice(),
            &bump,
        ];
        let signer = &[signer_seeds];

        // Burn the Digital Title inside its escrow — it never left the PDA.
        token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.escrow_title.to_account_info(),
                    authority: lot_info.clone(),
                },
                signer,
            ),
            1,
        )?;

        release_escrow(
            &ctx.accounts.token_program.to_account_info(),
            &lot_info,
            &ctx.accounts.escrow_usdc.to_account_info(),
            &ctx.accounts.producer_usdc.to_account_info(),
            &ctx.accounts.treasury_usdc.to_account_info(),
            signer,
            price,
            ctx.accounts.config.fee_bps,
        )?;

        lot.status = LotStatus::Redeemed;
        Ok(())
    }

    /// The producer collects when the buyer never confirmed nor disputed
    /// before `claimable_after`. Same release shape as `redeem_lot`: the
    /// Digital Title is burned and the escrow pays out minus the take
    /// rate — the clock signed instead of the buyer. A dispute freezes
    /// this path: `Disputed` lots cannot be claimed.
    pub fn claim_timeout(ctx: Context<ClaimTimeout>) -> Result<()> {
        let lot_info = ctx.accounts.lot.to_account_info();
        let lot = &mut ctx.accounts.lot;
        require!(lot.status == LotStatus::Funded, LotError::LotNotFunded);
        require!(
            Clock::get()?.unix_timestamp >= lot.claimable_after,
            LotError::ClaimTooEarly
        );
        let price = lot.price_usdc;
        let producer_key = lot.producer;
        let lot_id_bytes = lot.lot_id.as_bytes().to_vec();
        let bump = [lot.bump];
        let signer_seeds: &[&[u8]] = &[
            b"lot",
            producer_key.as_ref(),
            lot_id_bytes.as_slice(),
            &bump,
        ];
        let signer = &[signer_seeds];

        token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.escrow_title.to_account_info(),
                    authority: lot_info.clone(),
                },
                signer,
            ),
            1,
        )?;

        release_escrow(
            &ctx.accounts.token_program.to_account_info(),
            &lot_info,
            &ctx.accounts.escrow_usdc.to_account_info(),
            &ctx.accounts.producer_usdc.to_account_info(),
            &ctx.accounts.treasury_usdc.to_account_info(),
            signer,
            price,
            ctx.accounts.config.fee_bps,
        )?;

        lot.status = LotStatus::Claimed;
        Ok(())
    }

    /// The producer cancels a reservation the buyer never funded:
    /// `Listed → Cancelled`. The Digital Title is burned inside its
    /// escrow — a cancelled reservation can never settle. Once `Funded`
    /// cancellation is impossible: committed funds only exit through
    /// `redeem_lot`, `claim_timeout`, or a frozen `Disputed` state.
    pub fn cancel_lot(ctx: Context<CancelLot>) -> Result<()> {
        let lot_info = ctx.accounts.lot.to_account_info();
        let lot = &mut ctx.accounts.lot;
        require!(lot.status == LotStatus::Listed, LotError::LotNotListed);
        let producer_key = lot.producer;
        let lot_id_bytes = lot.lot_id.as_bytes().to_vec();
        let bump = [lot.bump];
        let signer_seeds: &[&[u8]] = &[
            b"lot",
            producer_key.as_ref(),
            lot_id_bytes.as_slice(),
            &bump,
        ];
        let signer = &[signer_seeds];

        token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.escrow_title.to_account_info(),
                    authority: lot_info,
                },
                signer,
            ),
            1,
        )?;

        lot.status = LotStatus::Cancelled;
        Ok(())
    }
}

/// Burns nothing: the caller already burned the title. Moves `price − fee`
/// to the producer and `fee` to the treasury out of the escrow ATA.
fn release_escrow<'info>(
    token_program: &AccountInfo<'info>,
    lot: &AccountInfo<'info>,
    escrow_usdc: &AccountInfo<'info>,
    producer_usdc: &AccountInfo<'info>,
    treasury_usdc: &AccountInfo<'info>,
    signer: &[&[&[u8]]],
    price_usdc: u64,
    fee_bps: u16,
) -> Result<()> {
    let fee = (price_usdc as u128)
        .checked_mul(fee_bps as u128)
        .ok_or(LotError::MathOverflow)?
        .checked_div(10_000)
        .ok_or(LotError::MathOverflow)? as u64;
    let release = price_usdc.checked_sub(fee).ok_or(LotError::MathOverflow)?;

    token::transfer(
        CpiContext::new_with_signer(
            token_program.clone(),
            token::Transfer {
                from: escrow_usdc.clone(),
                to: producer_usdc.clone(),
                authority: lot.clone(),
            },
            signer,
        ),
        release,
    )?;
    if fee > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                token_program.clone(),
                token::Transfer {
                    from: escrow_usdc.clone(),
                    to: treasury_usdc.clone(),
                    authority: lot.clone(),
                },
                signer,
            ),
            fee,
        )?;
    }
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = Config::SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    /// The singleton Config PDA being updated.
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    /// Only the configured admin may update the protocol fee.
    #[account(constraint = admin.key() == config.admin @ LotError::WrongAdmin)]
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(lot_id: String)]
pub struct CreateLot<'info> {
    #[account(
        init,
        payer = producer,
        space = Lot::SPACE,
        seeds = [b"lot", producer.key().as_ref(), lot_id.as_bytes()],
        bump
    )]
    pub lot: Account<'info, Lot>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    /// Digital Title mint, a PDA so its existence is bound to the lot.
    /// Authority is the Lot PDA, which signs every later CPI.
    #[account(
        init,
        payer = producer,
        seeds = [b"mint", lot.key().as_ref()],
        bump,
        mint::decimals = 0,
        mint::authority = lot,
        mint::freeze_authority = lot,
    )]
    pub mint: Account<'info, Mint>,

    /// Escrow token account holding the Digital Title. Owned by the Lot PDA;
    /// the title never leaves it.
    #[account(
        init,
        payer = producer,
        associated_token::mint = mint,
        associated_token::authority = lot,
    )]
    pub escrow_title: Account<'info, TokenAccount>,

    /// Escrow token account holding the buyer's USDC deposit between funding
    /// and release. Owned by the Lot PDA.
    #[account(
        init,
        payer = producer,
        associated_token::mint = usdc_mint,
        associated_token::authority = lot,
    )]
    pub escrow_usdc: Account<'info, TokenAccount>,

    /// Settlement mint; constrained to the Config's `usdc_mint`.
    #[account(
        constraint = usdc_mint.key() == config.usdc_mint @ LotError::WrongUsdcMint
    )]
    pub usdc_mint: Account<'info, Mint>,

    /// Metaplex metadata PDA for the mint.
    /// CHECK: created via CPI; addressed by the token metadata program.
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    /// Metaplex master edition PDA for the mint.
    /// CHECK: created via CPI; addressed by the token metadata program.
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

    #[account(mut)]
    pub producer: Signer<'info>,

    /// Metaplex Token Metadata program.
    /// CHECK: constrained to the canonical program id.
    #[account(
        constraint = token_metadata_program.key() == mpl_token_metadata::ID
            @ LotError::WrongMetadataProgram
    )]
    pub token_metadata_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct FundLot<'info> {
    /// The lot being funded; the PDA seeds prove the account is the real one.
    #[account(
        mut,
        seeds = [b"lot", lot.producer.as_ref(), lot.lot_id.as_bytes()],
        bump = lot.bump,
    )]
    pub lot: Account<'info, Lot>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    /// Only the buyer designated at creation may fund the escrow.
    #[account(
        mut,
        constraint = buyer.key() == lot.buyer @ LotError::WrongBuyer
    )]
    pub buyer: Signer<'info>,

    /// The buyer's USDC ATA — the source of the deposit.
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_usdc: Account<'info, TokenAccount>,

    /// The lot-owned escrow ATA created at `create_lot`; the destination.
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = lot,
    )]
    pub escrow_usdc: Account<'info, TokenAccount>,

    /// Settlement mint; constrained to the Config's `usdc_mint`.
    #[account(
        constraint = usdc_mint.key() == config.usdc_mint @ LotError::WrongUsdcMint
    )]
    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RedeemLot<'info> {
    /// The lot being redeemed; the PDA seeds prove the account is the real one.
    #[account(
        mut,
        seeds = [b"lot", lot.producer.as_ref(), lot.lot_id.as_bytes()],
        bump = lot.bump,
    )]
    pub lot: Account<'info, Lot>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    /// Only the designated buyer confirms receipt and releases the escrow.
    #[account(
        mut,
        constraint = buyer.key() == lot.buyer @ LotError::WrongBuyer
    )]
    pub buyer: Signer<'info>,

    /// The lot-owned escrow holding the deposit; drained by this instruction.
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = lot,
    )]
    pub escrow_usdc: Account<'info, TokenAccount>,

    /// The escrow holding the Digital Title; its single token is burned.
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = lot,
    )]
    pub escrow_title: Account<'info, TokenAccount>,

    /// The Digital Title mint; burn reduces its supply to zero.
    #[account(
        mut,
        constraint = mint.key() == lot.mint @ LotError::WrongTitleMint
    )]
    pub mint: Account<'info, Mint>,

    /// The lot's producer; only its address derives the release ATA.
    /// CHECK: constrained to `lot.producer`.
    #[account(constraint = producer.key() == lot.producer @ LotError::WrongProducer)]
    pub producer: UncheckedAccount<'info>,

    /// The protocol treasury; only its address derives the fee ATA.
    /// CHECK: constrained to `config.treasury`.
    #[account(constraint = treasury.key() == config.treasury @ LotError::WrongTreasury)]
    pub treasury: UncheckedAccount<'info>,

    /// The producer's USDC ATA — the release destination. The buyer creates
    /// it if the producer never held the settlement token.
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = usdc_mint,
        associated_token::authority = producer,
    )]
    pub producer_usdc: Account<'info, TokenAccount>,

    /// The treasury's USDC ATA — the fee destination.
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = usdc_mint,
        associated_token::authority = treasury,
    )]
    pub treasury_usdc: Account<'info, TokenAccount>,

    /// Settlement mint; constrained to the Config's `usdc_mint`.
    #[account(
        constraint = usdc_mint.key() == config.usdc_mint @ LotError::WrongUsdcMint
    )]
    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimTimeout<'info> {
    /// The lot being claimed; the PDA seeds prove the account is the real one.
    #[account(
        mut,
        seeds = [b"lot", lot.producer.as_ref(), lot.lot_id.as_bytes()],
        bump = lot.bump,
    )]
    pub lot: Account<'info, Lot>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    /// Only the lot's producer may claim an unresponsive buyer's escrow.
    #[account(
        mut,
        constraint = producer.key() == lot.producer @ LotError::WrongProducer
    )]
    pub producer: Signer<'info>,

    /// The lot-owned escrow holding the deposit; drained by this instruction.
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = lot,
    )]
    pub escrow_usdc: Account<'info, TokenAccount>,

    /// The escrow holding the Digital Title; its single token is burned.
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = lot,
    )]
    pub escrow_title: Account<'info, TokenAccount>,

    /// The Digital Title mint; burn reduces its supply to zero.
    #[account(
        mut,
        constraint = mint.key() == lot.mint @ LotError::WrongTitleMint
    )]
    pub mint: Account<'info, Mint>,

    /// The protocol treasury; only its address derives the fee ATA.
    /// CHECK: constrained to `config.treasury`.
    #[account(constraint = treasury.key() == config.treasury @ LotError::WrongTreasury)]
    pub treasury: UncheckedAccount<'info>,

    /// The producer's USDC ATA — the claim destination.
    #[account(
        init_if_needed,
        payer = producer,
        associated_token::mint = usdc_mint,
        associated_token::authority = producer,
    )]
    pub producer_usdc: Account<'info, TokenAccount>,

    /// The treasury's USDC ATA — the fee destination.
    #[account(
        init_if_needed,
        payer = producer,
        associated_token::mint = usdc_mint,
        associated_token::authority = treasury,
    )]
    pub treasury_usdc: Account<'info, TokenAccount>,

    /// Settlement mint; constrained to the Config's `usdc_mint`.
    #[account(
        constraint = usdc_mint.key() == config.usdc_mint @ LotError::WrongUsdcMint
    )]
    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelLot<'info> {
    /// The lot being cancelled; the PDA seeds prove the account is the real one.
    #[account(
        mut,
        seeds = [b"lot", lot.producer.as_ref(), lot.lot_id.as_bytes()],
        bump = lot.bump,
    )]
    pub lot: Account<'info, Lot>,

    /// Only the lot's producer may cancel its own reservation.
    #[account(
        mut,
        constraint = producer.key() == lot.producer @ LotError::WrongProducer
    )]
    pub producer: Signer<'info>,

    /// The escrow holding the Digital Title; its single token is burned.
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = lot,
    )]
    pub escrow_title: Account<'info, TokenAccount>,

    /// The Digital Title mint; burn reduces its supply to zero.
    #[account(
        mut,
        constraint = mint.key() == lot.mint @ LotError::WrongTitleMint
    )]
    pub mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub fee_bps: u16,
    pub usdc_mint: Pubkey,
    pub treasury: Pubkey,
    pub claim_min_secs: i64,
    pub claim_max_secs: i64,
    pub bump: u8,
}

impl Config {
    pub const SPACE: usize = 8 + 32 + 2 + 32 + 32 + 8 + 8 + 1;
}

#[account]
pub struct Lot {
    pub lot_id: String,
    pub origin_id: String,
    pub producer: Pubkey,
    pub buyer: Pubkey,
    pub mint: Pubkey,
    pub price_usdc: u64,
    pub volume_tonnes: u64,
    pub purity_basis_points: u64,
    pub water_m3_per_tonne_scaled: u64,
    pub carbon_kg_co2e_per_tonne_scaled: u64,
    pub claimable_after: i64,
    pub spec_sheet_hash: [u8; 32],
    pub status: LotStatus,
    pub created_at: i64,
    pub bump: u8,
}

impl Lot {
    pub const SPACE: usize = 8 // discriminator
        + 4 + MAX_LOT_ID_BYTES // lot_id
        + 4 + MAX_ORIGIN_ID_BYTES // origin_id
        + 32 * 3 // producer, buyer, mint
        + 8 * 5 // price + 4 metrics
        + 8 // claimable_after
        + 32 // spec_sheet_hash
        + 1 // status
        + 8 // created_at
        + 1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum LotStatus {
    Listed,
    Funded,
    Disputed,
    Redeemed,
    Claimed,
    Cancelled,
}

#[error_code]
pub enum LotError {
    #[msg("Lot id must be 1-32 bytes")]
    InvalidLotId,
    #[msg("Origin id must be 1-32 bytes")]
    InvalidOriginId,
    #[msg("Volume must be at least one tonne")]
    InvalidVolume,
    #[msg("Only battery grade (99.50-100.00%) is accepted")]
    NotBatteryGrade,
    #[msg("Price must be greater than zero")]
    InvalidPrice,
    #[msg("Buyer cannot be the producer")]
    BuyerIsProducer,
    #[msg("Fee must be at most 10000 bps")]
    InvalidFeeBps,
    #[msg("Invalid treasury address")]
    InvalidTreasury,
    #[msg("claim_min_secs must be > 0 and < claim_max_secs")]
    InvalidClaimWindow,
    #[msg("claimable_after is outside the configured claim window")]
    ClaimWindowOutOfBounds,
    #[msg("Metadata URI exceeds 200 bytes")]
    MetadataUriTooLong,
    #[msg("Mint is not the configured settlement mint")]
    WrongUsdcMint,
    #[msg("Not the Metaplex Token Metadata program")]
    WrongMetadataProgram,
    #[msg("Only the designated buyer may fund this lot")]
    WrongBuyer,
    #[msg("Lot is not open for funding")]
    LotNotListed,
    #[msg("Lot is not funded or disputed")]
    LotNotFunded,
    #[msg("Mint is not this lot's Digital Title")]
    WrongTitleMint,
    #[msg("Account is not the lot's producer")]
    WrongProducer,
    #[msg("Account is not the configured treasury")]
    WrongTreasury,
    #[msg("claimable_after has not been reached")]
    ClaimTooEarly,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Account is not the configured admin")]
    WrongAdmin,
}
