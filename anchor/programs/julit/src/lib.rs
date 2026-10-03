use anchor_lang::prelude::*;

declare_id!("D3aKAxF8NEU7iADrc9E7GrM2NZnn3qFfkev4mKE1nhxg");

pub const MAX_BATCH_ID_BYTES: usize = 32;
pub const MAX_ORIGIN_ID_BYTES: usize = 32;

#[program]
pub mod julit {
    use super::*;

    /// Registers a battery-grade lithium batch. The batch PDA is derived from
    /// the producer wallet and the batch identifier, so an identifier is
    /// unique per producer and reusable by another one.
    ///
    /// All decimal metrics arrive pre-scaled as integers by the client:
    /// purity in basis points, water/carbon x100, price x1_000_000.
    pub fn create_batch(
        ctx: Context<CreateBatch>,
        batch_id: String,
        origin_id: String,
        volume_tonnes: u64,
        purity_basis_points: u64,
        water_m3_per_tonne_scaled: u64,
        carbon_kg_co2e_per_tonne_scaled: u64,
        price_usdc_scaled: u64,
        reserved_buyer: Option<Pubkey>,
    ) -> Result<()> {
        require!(
            !batch_id.is_empty() && batch_id.len() <= MAX_BATCH_ID_BYTES,
            BatchError::InvalidBatchId
        );
        require!(volume_tonnes >= 1, BatchError::InvalidVolume);
        require!(
            (9_950..=10_000).contains(&purity_basis_points),
            BatchError::NotBatteryGrade
        );
        require!(price_usdc_scaled > 0, BatchError::InvalidPrice);

        let auditor = ctx.accounts.auditor.key();
        let producer = ctx.accounts.producer.key();
        require!(auditor != producer, BatchError::AuditorIsProducer);
        if let Some(buyer) = reserved_buyer {
            require!(
                buyer != producer && buyer != auditor,
                BatchError::BuyerIsParty
            );
        }

        let batch = &mut ctx.accounts.batch;
        batch.batch_id = batch_id;
        batch.origin_id = origin_id;
        batch.producer = producer;
        batch.auditor = auditor;
        batch.reserved_buyer = reserved_buyer;
        batch.buyer = None;
        batch.volume_tonnes = volume_tonnes;
        batch.purity_basis_points = purity_basis_points;
        batch.water_m3_per_tonne_scaled = water_m3_per_tonne_scaled;
        batch.carbon_kg_co2e_per_tonne_scaled = carbon_kg_co2e_per_tonne_scaled;
        batch.price_usdc_scaled = price_usdc_scaled;
        batch.status = BatchStatus::Created;
        batch.created_slot = Clock::get()?.slot;
        batch.bump = ctx.bumps.batch;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(batch_id: String)]
pub struct CreateBatch<'info> {
    #[account(
        init,
        payer = producer,
        space = Batch::space(batch_id.len()),
        seeds = [b"batch", producer.key().as_ref(), batch_id.as_bytes()],
        bump
    )]
    pub batch: Account<'info, Batch>,
    /// The company wallet signing as batch producer.
    #[account(mut)]
    pub producer: Signer<'info>,
    /// Designated auditor company wallet (unchecked address; the index
    /// enforces the off-chain contract, the program only stores it).
    /// CHECK: stored as-is, validated off-chain by the index.
    pub auditor: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Batch {
    pub batch_id: String,
    pub origin_id: String,
    pub producer: Pubkey,
    pub auditor: Pubkey,
    pub reserved_buyer: Option<Pubkey>,
    pub buyer: Option<Pubkey>,
    pub volume_tonnes: u64,
    pub purity_basis_points: u64,
    pub water_m3_per_tonne_scaled: u64,
    pub carbon_kg_co2e_per_tonne_scaled: u64,
    pub price_usdc_scaled: u64,
    pub status: BatchStatus,
    pub created_slot: u64,
    pub bump: u8,
}

impl Batch {
    pub fn space(batch_id_len: usize) -> usize {
        8 // discriminator
            + 4 + batch_id_len // batch_id
            + 4 + MAX_ORIGIN_ID_BYTES // origin_id
            + 32 // producer
            + 32 // auditor
            + 1 + 32 // reserved_buyer
            + 1 + 32 // buyer
            + 8 * 6 // metrics + created_slot
            + 1 // status
            + 1 // bump
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum BatchStatus {
    Created,
    Audited,
    Completed,
}

#[error_code]
pub enum BatchError {
    #[msg("Batch id must be 1-32 bytes")]
    InvalidBatchId,
    #[msg("Volume must be at least one tonne")]
    InvalidVolume,
    #[msg("Only battery grade (99.50-100.00%) is accepted")]
    NotBatteryGrade,
    #[msg("Price must be greater than zero")]
    InvalidPrice,
    #[msg("Auditor cannot be the producer")]
    AuditorIsProducer,
    #[msg("Reserved buyer cannot be the producer or the auditor")]
    BuyerIsParty,
}
