# language: en
# Layer tags: @program = Anchor programme, @api = authenticated API, @db = Supabase schema and RLS, @ui = frontend
Feature: Lot registration and public indexing
  A Producer registers a battery-grade Lot on Solana Devnet; the Digital Title is
  minted into the lot-owned escrow at creation and the authenticated API verifies
  the on-chain snapshot before publishing it in the public index.

  Background:
    Given a provisioned Producer company with a verified wallet
    And a registered Buyer company with a verified wallet
    And the producer and the buyer hold an accepted commercial contract

  @program @api @db
  Scenario: Register a battery-grade lot reserved for a buyer
    Given the Producer builds a create_lot transaction carrying
      | field             | value                |
      | lot_id            | LIT-2026-PBL-02      |
      | origin_id         | Salar de Peña Blanca |
      | volume_tonnes     | 100                  |
      | purity_pct        | 99.50                |
      | water_m3_per_t    | 125.50               |
      | carbon_kg_per_t   | 450.25               |
      | price_usdc        | 12000.123456         |
    And the transaction designates the contracted Buyer
    And the transaction sets claimable_after inside the configured window
    And the transaction carries the lot spec sheet SHA-256
    When the Producer signs and submits the transaction to Devnet
    Then the Lot account is created with status "listed"
    And exactly one Digital Title token is minted into the lot-owned escrow ATA
    And the lot-owned USDC escrow ATA is created empty
    When the API verifies programme ownership, account discriminator, PDA derivation,
    transaction confirmation, the producer signer and account data
    Then the Lot is indexed with status "listed"

  @api
  Scenario: Upload the lot spec sheet before registering
    Given the Producer holds a lot spec sheet PDF
    When the Producer uploads it through the authenticated API
    Then the API recomputes the SHA-256 of the stored bytes
    And the spec sheet is stored at "<producer_wallet>/<lowercase digest>.pdf"
    And the returned digest is the value create_lot must carry on-chain

  @program @db
  Scenario Outline: Reject non-battery-grade or out-of-range metrics
    Given a create_lot transaction with <field> set to <value>
    When the programme or the index validates the Lot
    Then the operation is rejected
    And the value is never rounded, truncated or wrapped

    Examples:
      | field           | value                 |
      | purity          | 99.49%                |
      | purity          | 99.505%               |
      | volume_tonnes   | 0                     |
      | price_usdc      | 0                     |

  @program @db
  Scenario: A lot identifier is unique per Producer
    Given a Producer that already registered lot "LIT-2026-EXAR-02"
    When the same Producer registers another lot "LIT-2026-EXAR-02"
    Then the registration is rejected because the PDA already exists
    But another Producer may register the same lot identifier

  @program @db
  Scenario: Reject a buyer designation without an accepted contract
    Given a Buyer company with no accepted contract with the Producer
    When the Producer registers a Lot reserved for that Buyer
    Then the database rejects the lot row

  @program
  Scenario: Reject a claim window outside the configured bounds
    Given the Config bounds claims between claim_min_secs and claim_max_secs
    When create_lot sets claimable_after outside that window
    Then the programme rejects the instruction

  @api
  Scenario: Indexing requires a verified on-chain Lot
    Given a PDA not owned by the JuLit programme, or a failed or unconfirmed transaction
    When the API receives an indexing request for it
    Then the API rejects the request
    And the index is not modified
