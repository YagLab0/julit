use anchor_lang::{AnchorDeserialize, AnchorSerialize, InstructionData, ToAccountMetas};
use julit::{accounts, instruction, Config, Lot, LotStatus};
use litesvm::LiteSVM;
use solana_sdk::compute_budget::ComputeBudgetInstruction;
use solana_sdk::instruction::Instruction;
use solana_sdk::program_pack::Pack;
use solana_sdk::native_token::LAMPORTS_PER_SOL;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::{Keypair, Signer};
use solana_sdk::sysvar;
use solana_sdk::transaction::Transaction;

const MPL_ID: Pubkey = solana_sdk::pubkey!("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const JULIT_SO: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../target/deploy/julit.so");
const MPL_SO: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/mpl_token_metadata.so");

fn svm() -> (LiteSVM, Keypair) {
    let mut svm = LiteSVM::new().with_default_programs();
    svm.add_program_from_file(julit::ID, JULIT_SO).unwrap();
    svm.add_program_from_file(MPL_ID, MPL_SO).unwrap();
    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();
    (svm, payer)
}

fn send(svm: &mut LiteSVM, ixs: Vec<Instruction>, signers: &[&Keypair]) {
    let payer = signers[0];
    let tx = Transaction::new_signed_with_payer(
        &ixs,
        Some(&payer.pubkey()),
        signers,
        svm.latest_blockhash(),
    );
    svm.send_transaction(tx).unwrap();
}

fn send_err(svm: &mut LiteSVM, ixs: Vec<Instruction>, signers: &[&Keypair]) -> String {
    let payer = signers[0];
    let tx = Transaction::new_signed_with_payer(
        &ixs,
        Some(&payer.pubkey()),
        signers,
        svm.latest_blockhash(),
    );
    format!("{:?}", svm.send_transaction(tx).unwrap_err())
}

fn create_usdc_mint(svm: &mut LiteSVM, payer: &Keypair) -> Pubkey {
    let mint = Keypair::new();
    let rent = svm.minimum_balance_for_rent_exemption(spl_token::state::Mint::LEN);
    send(
        svm,
        vec![
            solana_sdk::system_instruction::create_account(
                &payer.pubkey(),
                &mint.pubkey(),
                rent,
                spl_token::state::Mint::LEN as u64,
                &spl_token::ID,
            ),
            spl_token::instruction::initialize_mint2(
                &spl_token::ID,
                &mint.pubkey(),
                &payer.pubkey(),
                None,
                6,
            )
            .unwrap(),
        ],
        &[payer, &mint],
    );
    mint.pubkey()
}

fn config_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"config"], &julit::ID)
}

fn initialize(svm: &mut LiteSVM, payer: &Keypair, usdc_mint: Pubkey, treasury: Pubkey) {
    let (config, _) = config_pda();
    let ix = Instruction {
        program_id: julit::ID,
        accounts: accounts::Initialize {
            config,
            admin: payer.pubkey(),
            system_program: solana_sdk::system_program::ID,
        }
        .to_account_metas(None),
        data: instruction::Initialize {
            fee_bps: 50,
            usdc_mint,
            treasury,
            claim_min_secs: 60,
            claim_max_secs: 60 * 60 * 24 * 365,
        }
        .data(),
    };
    send(svm, vec![ix], &[payer]);
}

fn metadata_pda(mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"metadata", MPL_ID.as_ref(), mint.as_ref()], &MPL_ID).0
}

fn edition_pda(mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"metadata", MPL_ID.as_ref(), mint.as_ref(), b"edition"],
        &MPL_ID,
    )
    .0
}

#[allow(clippy::too_many_arguments)]
fn create_lot_ix(
    producer: &Pubkey,
    usdc_mint: &Pubkey,
    lot_id: &str,
    price: u64,
    buyer: Pubkey,
    claimable_after: i64,
    purity_bps: u64,
) -> (Instruction, Pubkey, Pubkey) {
    let (lot, _) = Pubkey::find_program_address(
        &[b"lot", producer.as_ref(), lot_id.as_bytes()],
        &julit::ID,
    );
    let (mint, _) =
        Pubkey::find_program_address(&[b"mint", lot.as_ref()], &julit::ID);
    let (config, _) = config_pda();
    let escrow_title = spl_associated_token_account::get_associated_token_address(&lot, &mint);
    let escrow_usdc =
        spl_associated_token_account::get_associated_token_address(&lot, usdc_mint);
    let ix = Instruction {
        program_id: julit::ID,
        accounts: accounts::CreateLot {
            lot,
            config,
            mint,
            escrow_title,
            escrow_usdc,
            usdc_mint: *usdc_mint,
            metadata: metadata_pda(&mint),
            master_edition: edition_pda(&mint),
            producer: *producer,
            token_metadata_program: MPL_ID,
            token_program: spl_token::ID,
            associated_token_program: spl_associated_token_account::ID,
            system_program: solana_sdk::system_program::ID,
            rent: sysvar::rent::ID,
        }
        .to_account_metas(None),
        data: instruction::CreateLot {
            lot_id: lot_id.to_string(),
            origin_id: "SALAR-01".to_string(),
            volume_tonnes: 20,
            purity_basis_points: purity_bps,
            water_m3_per_tonne_scaled: 500,
            carbon_kg_co2e_per_tonne_scaled: 10_000,
            price_usdc: price,
            buyer,
            claimable_after,
            plant_cert_hash: [7u8; 32],
            metadata_uri: String::new(),
        }
        .data(),
    };
    (ix, lot, mint)
}

fn fund_lot_ix(buyer: &Pubkey, lot: &Pubkey, usdc_mint: &Pubkey) -> Instruction {
    let (config, _) = config_pda();
    let buyer_usdc =
        spl_associated_token_account::get_associated_token_address(buyer, usdc_mint);
    let escrow_usdc =
        spl_associated_token_account::get_associated_token_address(lot, usdc_mint);
    Instruction {
        program_id: julit::ID,
        accounts: accounts::FundLot {
            lot: *lot,
            config,
            buyer: *buyer,
            buyer_usdc,
            escrow_usdc,
            usdc_mint: *usdc_mint,
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
        data: instruction::FundLot {}.data(),
    }
}

/// Creates the buyer's USDC ATA and mints `amount` base units into it.
/// `payer` is the demo mint authority and fee payer.
fn provision_buyer(
    svm: &mut LiteSVM,
    payer: &Keypair,
    usdc_mint: &Pubkey,
    buyer: &Pubkey,
    amount: u64,
) {
    let buyer_ata =
        spl_associated_token_account::get_associated_token_address(buyer, usdc_mint);
    send(
        svm,
        vec![
            spl_associated_token_account::instruction::create_associated_token_account(
                &payer.pubkey(),
                buyer,
                usdc_mint,
                &spl_token::ID,
            ),
            spl_token::instruction::mint_to(
                &spl_token::ID,
                usdc_mint,
                &buyer_ata,
                &payer.pubkey(),
                &[],
                amount,
            )
            .unwrap(),
        ],
        &[payer],
    );
}

fn token_balance(svm: &LiteSVM, ata: &Pubkey) -> u64 {
    spl_token::state::Account::unpack(&svm.get_account(ata).unwrap().data)
        .unwrap()
        .amount
}

fn title_mint(lot: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"mint", lot.as_ref()], &julit::ID).0
}

fn ata(owner: &Pubkey, mint: &Pubkey) -> Pubkey {
    spl_associated_token_account::get_associated_token_address(owner, mint)
}

#[allow(clippy::too_many_arguments)]
fn redeem_lot_ix(
    buyer: &Pubkey,
    lot: &Pubkey,
    producer: &Pubkey,
    treasury: &Pubkey,
    usdc_mint: &Pubkey,
) -> Instruction {
    let (config, _) = config_pda();
    let mint = title_mint(lot);
    Instruction {
        program_id: julit::ID,
        accounts: accounts::RedeemLot {
            lot: *lot,
            config,
            buyer: *buyer,
            escrow_usdc: ata(lot, usdc_mint),
            escrow_title: ata(lot, &mint),
            mint,
            producer: *producer,
            treasury: *treasury,
            producer_usdc: ata(producer, usdc_mint),
            treasury_usdc: ata(treasury, usdc_mint),
            usdc_mint: *usdc_mint,
            token_program: spl_token::ID,
            associated_token_program: spl_associated_token_account::ID,
            system_program: solana_sdk::system_program::ID,
        }
        .to_account_metas(None),
        data: instruction::RedeemLot {}.data(),
    }
}

fn claim_timeout_ix(
    producer: &Pubkey,
    lot: &Pubkey,
    treasury: &Pubkey,
    usdc_mint: &Pubkey,
) -> Instruction {
    let (config, _) = config_pda();
    let mint = title_mint(lot);
    Instruction {
        program_id: julit::ID,
        accounts: accounts::ClaimTimeout {
            lot: *lot,
            config,
            producer: *producer,
            escrow_usdc: ata(lot, usdc_mint),
            escrow_title: ata(lot, &mint),
            mint,
            treasury: *treasury,
            producer_usdc: ata(producer, usdc_mint),
            treasury_usdc: ata(treasury, usdc_mint),
            usdc_mint: *usdc_mint,
            token_program: spl_token::ID,
            associated_token_program: spl_associated_token_account::ID,
            system_program: solana_sdk::system_program::ID,
        }
        .to_account_metas(None),
        data: instruction::ClaimTimeout {}.data(),
    }
}

fn cancel_lot_ix(producer: &Pubkey, lot: &Pubkey) -> Instruction {
    let mint = title_mint(lot);
    Instruction {
        program_id: julit::ID,
        accounts: accounts::CancelLot {
            lot: *lot,
            producer: *producer,
            escrow_title: ata(lot, &mint),
            mint,
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
        data: instruction::CancelLot {}.data(),
    }
}

/// Writes `Disputed` straight into the lot account: no instruction can reach
/// that state anymore, but legacy disputed lots still exercise the redeem and
/// claim_timeout guards.
fn mark_disputed(svm: &mut LiteSVM, lot: &Pubkey) {
    let mut account = svm.get_account(lot).unwrap();
    let mut decoded = Lot::deserialize(&mut &account.data[8..]).unwrap();
    decoded.status = LotStatus::Disputed;
    let mut bytes = account.data[..8].to_vec();
    decoded.serialize(&mut bytes).unwrap();
    account.data = bytes;
    svm.set_account(*lot, account).unwrap();
}

/// Moves the Clock sysvar past `lot.claimable_after`.
fn warp_past_claim_deadline(svm: &mut LiteSVM, lot: &Pubkey) {
    let data = svm.get_account(lot).unwrap().data;
    let decoded = Lot::deserialize(&mut &data[8..]).unwrap();
    let mut clock = svm.get_sysvar::<solana_sdk::clock::Clock>();
    clock.unix_timestamp = decoded.claimable_after + 1;
    svm.set_sysvar(&clock);
}

/// Shared setup: config + a listed lot priced at `price`, funded buyer ATA.
/// Returns (buyer keypair, lot pda).
fn listed_lot(
    svm: &mut LiteSVM,
    payer: &Keypair,
    usdc_mint: &Pubkey,
    price: u64,
    buyer_balance: u64,
) -> (Keypair, Pubkey) {
    let buyer = Keypair::new();
    svm.airdrop(&buyer.pubkey(), LAMPORTS_PER_SOL).unwrap();
    provision_buyer(svm, payer, usdc_mint, &buyer.pubkey(), buyer_balance);
    let now = svm.get_sysvar::<solana_sdk::clock::Clock>().unix_timestamp;
    let (ix, lot, _) = create_lot_ix(
        &payer.pubkey(),
        usdc_mint,
        "LOT-FUND",
        price,
        buyer.pubkey(),
        now + 86_400,
        9_960,
    );
    send(
        svm,
        vec![
            ComputeBudgetInstruction::set_compute_unit_limit(1_400_000),
            ix,
        ],
        &[payer],
    );
    (buyer, lot)
}

#[test]
fn fund_lot_moves_exact_price_into_escrow() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    initialize(&mut svm, &payer, usdc_mint, Keypair::new().pubkey());
    let (buyer, lot) = listed_lot(&mut svm, &payer, &usdc_mint, 400_000_000, 500_000_000);

    let buyer_ata =
        spl_associated_token_account::get_associated_token_address(&buyer.pubkey(), &usdc_mint);
    let escrow_usdc =
        spl_associated_token_account::get_associated_token_address(&lot, &usdc_mint);

    send(
        &mut svm,
        vec![fund_lot_ix(&buyer.pubkey(), &lot, &usdc_mint)],
        &[&payer, &buyer],
    );

    assert_eq!(token_balance(&svm, &escrow_usdc), 400_000_000);
    assert_eq!(token_balance(&svm, &buyer_ata), 100_000_000);
    let lot_data = svm.get_account(&lot).unwrap().data;
    let decoded = Lot::deserialize(&mut &lot_data[8..]).unwrap();
    assert!(decoded.status == LotStatus::Funded);
}

#[test]
fn fund_lot_rejects_wrong_buyer() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    initialize(&mut svm, &payer, usdc_mint, Keypair::new().pubkey());
    let (_buyer, lot) = listed_lot(&mut svm, &payer, &usdc_mint, 400_000_000, 500_000_000);

    let impostor = Keypair::new();
    provision_buyer(&mut svm, &payer, &usdc_mint, &impostor.pubkey(), 500_000_000);
    let err = send_err(
        &mut svm,
        vec![fund_lot_ix(&impostor.pubkey(), &lot, &usdc_mint)],
        &[&payer, &impostor],
    );
    assert!(err.contains("WrongBuyer") || err.contains("601"), "{err}");
}

#[test]
fn fund_lot_rejects_double_funding() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    initialize(&mut svm, &payer, usdc_mint, Keypair::new().pubkey());
    let (buyer, lot) = listed_lot(&mut svm, &payer, &usdc_mint, 400_000_000, 900_000_000);

    send(
        &mut svm,
        vec![fund_lot_ix(&buyer.pubkey(), &lot, &usdc_mint)],
        &[&payer, &buyer],
    );
    // Fresh blockhash so the retry is a distinct transaction, not a dedup hit.
    svm.expire_blockhash();
    let err = send_err(
        &mut svm,
        vec![fund_lot_ix(&buyer.pubkey(), &lot, &usdc_mint)],
        &[&payer, &buyer],
    );
    assert!(err.contains("LotNotListed") || err.contains("601"), "{err}");
}

#[test]
fn fund_lot_rejects_insufficient_balance() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    initialize(&mut svm, &payer, usdc_mint, Keypair::new().pubkey());
    let (buyer, lot) = listed_lot(&mut svm, &payer, &usdc_mint, 400_000_000, 399_999_999);

    let err = send_err(
        &mut svm,
        vec![fund_lot_ix(&buyer.pubkey(), &lot, &usdc_mint)],
        &[&payer, &buyer],
    );
    assert!(err.contains("InsufficientFunds") || err.contains("custom program error"), "{err}");
}

/// Config + listed lot + funded escrow. Returns (treasury, buyer, lot).
fn funded_lot(
    svm: &mut LiteSVM,
    payer: &Keypair,
    usdc_mint: &Pubkey,
    price: u64,
) -> (Keypair, Keypair, Pubkey) {
    let treasury = Keypair::new();
    initialize(svm, payer, *usdc_mint, treasury.pubkey());
    let (buyer, lot) = listed_lot(svm, payer, usdc_mint, price, price * 2);
    send(
        svm,
        vec![fund_lot_ix(&buyer.pubkey(), &lot, usdc_mint)],
        &[payer, &buyer],
    );
    svm.expire_blockhash();
    (treasury, buyer, lot)
}

#[test]
fn redeem_lot_burns_title_and_splits_escrow() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    // fee_bps = 50 → fee = 2_000_000 on a 400_000_000 lot.
    let (treasury, buyer, lot) = funded_lot(&mut svm, &payer, &usdc_mint, 400_000_000);

    send(
        &mut svm,
        vec![redeem_lot_ix(
            &buyer.pubkey(),
            &lot,
            &payer.pubkey(),
            &treasury.pubkey(),
            &usdc_mint,
        )],
        &[&payer, &buyer],
    );

    assert_eq!(token_balance(&svm, &ata(&payer.pubkey(), &usdc_mint)), 398_000_000);
    assert_eq!(token_balance(&svm, &ata(&treasury.pubkey(), &usdc_mint)), 2_000_000);
    assert_eq!(token_balance(&svm, &ata(&lot, &usdc_mint)), 0);

    // The Digital Title is burned inside escrow; mint supply hits zero.
    let mint = title_mint(&lot);
    assert_eq!(token_balance(&svm, &ata(&lot, &mint)), 0);
    let mint_state =
        spl_token::state::Mint::unpack(&svm.get_account(&mint).unwrap().data).unwrap();
    assert_eq!(mint_state.supply, 0);

    let decoded = Lot::deserialize(&mut &svm.get_account(&lot).unwrap().data[8..]).unwrap();
    assert!(decoded.status == LotStatus::Redeemed);
}

#[test]
fn redeem_lot_works_from_disputed() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    let (treasury, buyer, lot) = funded_lot(&mut svm, &payer, &usdc_mint, 400_000_000);

    mark_disputed(&mut svm, &lot);
    send(
        &mut svm,
        vec![redeem_lot_ix(
            &buyer.pubkey(),
            &lot,
            &payer.pubkey(),
            &treasury.pubkey(),
            &usdc_mint,
        )],
        &[&payer, &buyer],
    );

    let decoded = Lot::deserialize(&mut &svm.get_account(&lot).unwrap().data[8..]).unwrap();
    assert!(decoded.status == LotStatus::Redeemed);
}

#[test]
fn redeem_lot_rejects_wrong_buyer() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    let (treasury, _buyer, lot) = funded_lot(&mut svm, &payer, &usdc_mint, 400_000_000);

    let impostor = Keypair::new();
    svm.airdrop(&impostor.pubkey(), LAMPORTS_PER_SOL).unwrap();
    let err = send_err(
        &mut svm,
        vec![redeem_lot_ix(
            &impostor.pubkey(),
            &lot,
            &payer.pubkey(),
            &treasury.pubkey(),
            &usdc_mint,
        )],
        &[&payer, &impostor],
    );
    assert!(err.contains("WrongBuyer") || err.contains("601"), "{err}");
}

#[test]
fn redeem_lot_rejects_unfunded_lot() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    let treasury = Keypair::new();
    initialize(&mut svm, &payer, usdc_mint, treasury.pubkey());
    let (buyer, lot) = listed_lot(&mut svm, &payer, &usdc_mint, 400_000_000, 500_000_000);

    let err = send_err(
        &mut svm,
        vec![redeem_lot_ix(
            &buyer.pubkey(),
            &lot,
            &payer.pubkey(),
            &treasury.pubkey(),
            &usdc_mint,
        )],
        &[&payer, &buyer],
    );
    assert!(err.contains("LotNotFunded") || err.contains("601"), "{err}");
}

#[test]
fn redeem_lot_rejects_double_redeem() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    let (treasury, buyer, lot) = funded_lot(&mut svm, &payer, &usdc_mint, 400_000_000);

    send(
        &mut svm,
        vec![redeem_lot_ix(
            &buyer.pubkey(),
            &lot,
            &payer.pubkey(),
            &treasury.pubkey(),
            &usdc_mint,
        )],
        &[&payer, &buyer],
    );
    svm.expire_blockhash();

    let err = send_err(
        &mut svm,
        vec![redeem_lot_ix(
            &buyer.pubkey(),
            &lot,
            &payer.pubkey(),
            &treasury.pubkey(),
            &usdc_mint,
        )],
        &[&payer, &buyer],
    );
    assert!(err.contains("LotNotFunded") || err.contains("601"), "{err}");
}

#[test]
fn claim_timeout_releases_to_producer_after_deadline() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    let (treasury, _buyer, lot) = funded_lot(&mut svm, &payer, &usdc_mint, 400_000_000);

    warp_past_claim_deadline(&mut svm, &lot);
    send(
        &mut svm,
        vec![claim_timeout_ix(
            &payer.pubkey(),
            &lot,
            &treasury.pubkey(),
            &usdc_mint,
        )],
        &[&payer],
    );

    assert_eq!(token_balance(&svm, &ata(&payer.pubkey(), &usdc_mint)), 398_000_000);
    assert_eq!(token_balance(&svm, &ata(&treasury.pubkey(), &usdc_mint)), 2_000_000);
    assert_eq!(token_balance(&svm, &ata(&lot, &usdc_mint)), 0);

    let mint = title_mint(&lot);
    let mint_state =
        spl_token::state::Mint::unpack(&svm.get_account(&mint).unwrap().data).unwrap();
    assert_eq!(mint_state.supply, 0);

    let decoded = Lot::deserialize(&mut &svm.get_account(&lot).unwrap().data[8..]).unwrap();
    assert!(decoded.status == LotStatus::Claimed);
}

#[test]
fn claim_timeout_rejects_before_deadline() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    let (treasury, _buyer, lot) = funded_lot(&mut svm, &payer, &usdc_mint, 400_000_000);

    let err = send_err(
        &mut svm,
        vec![claim_timeout_ix(
            &payer.pubkey(),
            &lot,
            &treasury.pubkey(),
            &usdc_mint,
        )],
        &[&payer],
    );
    assert!(err.contains("ClaimTooEarly") || err.contains("601"), "{err}");
}

#[test]
fn claim_timeout_rejects_disputed_lot() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    let (treasury, _buyer, lot) = funded_lot(&mut svm, &payer, &usdc_mint, 400_000_000);

    mark_disputed(&mut svm, &lot);
    warp_past_claim_deadline(&mut svm, &lot);

    let err = send_err(
        &mut svm,
        vec![claim_timeout_ix(
            &payer.pubkey(),
            &lot,
            &treasury.pubkey(),
            &usdc_mint,
        )],
        &[&payer],
    );
    assert!(err.contains("LotNotFunded") || err.contains("601"), "{err}");
}

#[test]
fn claim_timeout_rejects_wrong_signer() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    let (treasury, buyer, lot) = funded_lot(&mut svm, &payer, &usdc_mint, 400_000_000);

    warp_past_claim_deadline(&mut svm, &lot);
    // The buyer cannot trigger the producer's claim path.
    let err = send_err(
        &mut svm,
        vec![claim_timeout_ix(
            &buyer.pubkey(),
            &lot,
            &treasury.pubkey(),
            &usdc_mint,
        )],
        &[&payer, &buyer],
    );
    assert!(err.contains("WrongProducer") || err.contains("601"), "{err}");
}

#[test]
fn initialize_and_create_lot_mints_title_into_escrow() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    let treasury = Keypair::new().pubkey();
    initialize(&mut svm, &payer, usdc_mint, treasury);

    let (config_pda, _) = config_pda();
    let config = Config::deserialize(
        &mut &svm.get_account(&config_pda).unwrap().data[8..],
    )
    .unwrap();
    assert_eq!(config.fee_bps, 50);
    assert_eq!(config.usdc_mint, usdc_mint);
    assert_eq!(config.treasury, treasury);

    let buyer = Keypair::new().pubkey();
    let now = svm.get_sysvar::<solana_sdk::clock::Clock>().unix_timestamp;
    let (ix, lot_pda, mint) = create_lot_ix(
        &payer.pubkey(),
        &usdc_mint,
        "LOT-001",
        400_000_000,
        buyer,
        now + 86_400,
        9_960,
    );
    send(
        &mut svm,
        vec![
            ComputeBudgetInstruction::set_compute_unit_limit(1_400_000),
            ix,
        ],
        &[&payer],
    );

    let lot_data = svm.get_account(&lot_pda).unwrap().data;
    let lot = Lot::deserialize(&mut &lot_data[8..]).unwrap();
    assert_eq!(lot.lot_id, "LOT-001");
    assert_eq!(lot.producer, payer.pubkey());
    assert_eq!(lot.buyer, buyer);
    assert_eq!(lot.price_usdc, 400_000_000);
    assert!(lot.status == LotStatus::Listed);
    assert_eq!(lot.plant_cert_hash, [7u8; 32]);

    // Digital Title: exactly one, sitting in the lot's escrow ATA.
    let escrow_title =
        spl_associated_token_account::get_associated_token_address(&lot_pda, &mint);
    let escrow = spl_token::state::Account::unpack(
        &svm.get_account(&escrow_title).unwrap().data,
    )
    .unwrap();
    assert_eq!(escrow.amount, 1);
    assert_eq!(escrow.owner, lot_pda);

    // Metaplex metadata + master edition exist, owned by the TM program.
    let metadata = svm.get_account(&metadata_pda(&mint)).unwrap();
    assert_eq!(metadata.owner, MPL_ID);
    let edition = svm.get_account(&edition_pda(&mint)).unwrap();
    assert_eq!(edition.owner, MPL_ID);
}

#[test]
fn create_lot_rejects_buyer_is_producer() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    initialize(&mut svm, &payer, usdc_mint, Keypair::new().pubkey());
    let now = svm.get_sysvar::<solana_sdk::clock::Clock>().unix_timestamp;
    let (ix, _, _) = create_lot_ix(
        &payer.pubkey(),
        &usdc_mint,
        "LOT-BAD",
        1_000_000,
        payer.pubkey(),
        now + 86_400,
        9_960,
    );
    let err = send_err(&mut svm, vec![ix], &[&payer]);
    assert!(err.contains("BuyerIsProducer") || err.contains("6005"), "{err}");
}

#[test]
fn create_lot_rejects_claim_window_out_of_bounds() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    initialize(&mut svm, &payer, usdc_mint, Keypair::new().pubkey());
    let now = svm.get_sysvar::<solana_sdk::clock::Clock>().unix_timestamp;
    // min is 60s: 30s from now must fail.
    let (ix, _, _) = create_lot_ix(
        &payer.pubkey(),
        &usdc_mint,
        "LOT-T",
        1_000_000,
        Keypair::new().pubkey(),
        now + 30,
        9_960,
    );
    let err = send_err(&mut svm, vec![ix], &[&payer]);
    assert!(err.contains("ClaimWindowOutOfBounds") || err.contains("600"), "{err}");
}

#[test]
fn create_lot_rejects_non_battery_grade() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    initialize(&mut svm, &payer, usdc_mint, Keypair::new().pubkey());
    let now = svm.get_sysvar::<solana_sdk::clock::Clock>().unix_timestamp;
    let (ix, _, _) = create_lot_ix(
        &payer.pubkey(),
        &usdc_mint,
        "LOT-P",
        1_000_000,
        Keypair::new().pubkey(),
        now + 86_400,
        9_400,
    );
    let err = send_err(&mut svm, vec![ix], &[&payer]);
    assert!(err.contains("NotBatteryGrade") || err.contains("600"), "{err}");
}

#[test]
fn cancel_lot_burns_title_and_marks_cancelled() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    initialize(&mut svm, &payer, usdc_mint, Keypair::new().pubkey());
    let (_buyer, lot) = listed_lot(&mut svm, &payer, &usdc_mint, 400_000_000, 500_000_000);

    send(&mut svm, vec![cancel_lot_ix(&payer.pubkey(), &lot)], &[&payer]);

    let decoded = Lot::deserialize(&mut &svm.get_account(&lot).unwrap().data[8..]).unwrap();
    assert!(decoded.status == LotStatus::Cancelled);
    // The Digital Title is gone — escrow empty, supply zero.
    let mint = title_mint(&lot);
    assert_eq!(token_balance(&svm, &ata(&lot, &mint)), 0);
    let mint_acct =
        spl_token::state::Mint::unpack(&svm.get_account(&mint).unwrap().data).unwrap();
    assert_eq!(mint_acct.supply, 0);
}

#[test]
fn cancel_lot_rejects_wrong_signer() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    initialize(&mut svm, &payer, usdc_mint, Keypair::new().pubkey());
    let (buyer, lot) = listed_lot(&mut svm, &payer, &usdc_mint, 400_000_000, 500_000_000);

    // The buyer cannot cancel the producer's reservation.
    let err = send_err(
        &mut svm,
        vec![cancel_lot_ix(&buyer.pubkey(), &lot)],
        &[&payer, &buyer],
    );
    assert!(err.contains("WrongProducer") || err.contains("601"), "{err}");
}

#[test]
fn cancel_lot_rejects_funded_lot() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    let (_treasury, _buyer, lot) =
        funded_lot(&mut svm, &payer, &usdc_mint, 400_000_000);

    let err = send_err(
        &mut svm,
        vec![cancel_lot_ix(&payer.pubkey(), &lot)],
        &[&payer],
    );
    assert!(err.contains("LotNotListed") || err.contains("601"), "{err}");

    // Escrowed funds untouched — the funded lot is still intact.
    assert_eq!(token_balance(&svm, &ata(&lot, &usdc_mint)), 400_000_000);
}

#[test]
fn set_fee_bps_updates_fee_for_admin_only() {
    let (mut svm, payer) = svm();
    let usdc_mint = create_usdc_mint(&mut svm, &payer);
    initialize(&mut svm, &payer, usdc_mint, Keypair::new().pubkey());
    let (config, _) = config_pda();

    let ix = Instruction {
        program_id: julit::ID,
        accounts: accounts::UpdateConfig {
            config,
            admin: payer.pubkey(),
        }
        .to_account_metas(None),
        data: instruction::SetFeeBps { fee_bps: 100 }.data(),
    };
    send(&mut svm, vec![ix], &[&payer]);

    let updated = Config::deserialize(&mut &svm.get_account(&config).unwrap().data[8..]).unwrap();
    assert_eq!(updated.fee_bps, 100);

    let stranger = Keypair::new();
    svm.airdrop(&stranger.pubkey(), LAMPORTS_PER_SOL).unwrap();
    let ix = Instruction {
        program_id: julit::ID,
        accounts: accounts::UpdateConfig {
            config,
            admin: stranger.pubkey(),
        }
        .to_account_metas(None),
        data: instruction::SetFeeBps { fee_bps: 250 }.data(),
    };
    let err = send_err(&mut svm, vec![ix], &[&stranger]);
    assert!(err.contains("WrongAdmin"), "{err}");

    let updated = Config::deserialize(&mut &svm.get_account(&config).unwrap().data[8..]).unwrap();
    assert_eq!(updated.fee_bps, 100);
}
