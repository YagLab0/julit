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

    /// Certifies a batch exactly once. Only the designated auditor may sign;
    /// the audit record lives in its own PDA so the Batch layout never
    /// migrates and the certificate digest stays permanently on-chain for
    /// later forgery checks.
    pub fn certify_batch(
        ctx: Context<CertifyBatch>,
        audit_hash: [u8; 32],
        esg_approved: bool,
        eu_assessment: EuAssessment,
    ) -> Result<()> {
        let batch = &mut ctx.accounts.batch;
        batch.status = BatchStatus::Audited;

        let audit = &mut ctx.accounts.audit;
        audit.audit_hash = audit_hash;
        audit.esg_approved = esg_approved;
        audit.eu_assessment = eu_assessment;
        audit.certified_slot = Clock::get()?.slot;
        audit.bump = ctx.bumps.audit;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CertifyBatch<'info> {
    #[account(
        mut,
        seeds = [b"batch", batch.producer.as_ref(), batch.batch_id.as_bytes()],
        bump = batch.bump,
        has_one = auditor @ BatchError::NotDesignatedAuditor,
        constraint = batch.status == BatchStatus::Created @ BatchError::AlreadyCertified,
    )]
    pub batch: Account<'info, Batch>,
    /// One-shot audit record. `init` makes a second certification impossible.
    #[account(
        init,
        payer = auditor,
        space = Audit::SPACE,
        seeds = [b"audit", batch.key().as_ref()],
        bump
    )]
    pub audit: Account<'info, Audit>,
    /// The batch's designated auditor, signing and paying for the audit PDA.
    #[account(mut)]
    pub auditor: Signer<'info>,
    pub system_program: Program<'info, System>,
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

/// Immutable audit record for a certified batch. Lives in its own PDA
/// (["audit", batch]) so the Batch layout stays untouched.
#[account]
pub struct Audit {
    /// SHA-256 of the certificate PDF uploaded to storage.
    pub audit_hash: [u8; 32],
    pub esg_approved: bool,
    pub eu_assessment: EuAssessment,
    pub certified_slot: u64,
    pub bump: u8,
}

impl Audit {
    pub const SPACE: usize = 8 + 32 + 1 + 1 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum BatchStatus {
    Created,
    Audited,
    Completed,
}

/// EU Battery Regulation conformity outcome declared by the auditor.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum EuAssessment {
    Conformant,
    NonConformant,
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
    #[msg("Only the designated auditor can certify this batch")]
    NotDesignatedAuditor,
    #[msg("Batch is already audited")]
    AlreadyCertified,
}
