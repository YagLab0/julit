use anchor_lang::{AnchorDeserialize, InstructionData, ToAccountMetas};
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
