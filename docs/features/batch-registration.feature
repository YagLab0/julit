# language: en
# Layer tags: @program = Anchor programme, @api = authenticated API, @db = Supabase schema and RLS, @ui = frontend
Feature: Batch registration and public indexing
  A Producer registers a battery-grade Batch on Solana Devnet; the authenticated API
  verifies the on-chain snapshot before publishing it in the public index.

  Background:
    Given a Producer company with a verified wallet
    And a registered Auditor company with a verified wallet

  @program @api @db
  Scenario: Register a battery-grade batch
    Given the Producer builds a create_batch transaction carrying
      | field                              | value            |
      | batch_id                           | LIT-2026-EXAR-02 |
      | origin                             | Salar de Olaroz  |
      | volume_tonnes                      | 100              |
      | purity_pct                         | 99.50            |
      | water_footprint_m3_per_tonne       | 125.50           |
      | carbon_footprint_kg_co2e_per_tonne | 450.25           |
      | price_usdc                         | 12000.123456     |
    And the transaction designates the registered Auditor
    When the Producer signs and submits the transaction to Devnet
    And the API verifies programme ownership, account discriminator, PDA derivation, transaction confirmation and account data
    Then the Batch is indexed with status "created"
    And the observed slot and indexing time come from the verified snapshot

  @program @db
  Scenario Outline: Reject non-battery-grade or out-of-range metrics
    Given a create_batch transaction with <field> set to <value>
    When the programme or the index validates the Batch
    Then the operation is rejected
    And the value is never rounded, truncated or wrapped

    Examples:
      | field                              | value                 |
      | purity_pct                         | 99.49                 |
      | purity_pct                         | 99.505                |
      | volume_tonnes                      | 1.5                   |
      | volume_tonnes                      | 18446744073709551616  |
      | water_footprint_m3_per_tonne       | -0.01                 |
      | carbon_footprint_kg_co2e_per_tonne | NaN                   |
      | price_usdc                         | 1.0000001             |

  @program @db
  Scenario: A batch identifier is unique per Producer
    Given a Producer that already registered batch "LIT-2026-EXAR-02"
    When the same Producer registers another batch "LIT-2026-EXAR-02"
    Then the registration is rejected
    But another Producer may register the same batch identifier

  @program
  Scenario: Only a registered Auditor can be designated
    Given a wallet that belongs to no Auditor company
    When a create_batch transaction designates that wallet as the Auditor
    Then the programme rejects the instruction

  @program @db
  Scenario: Reserve a Batch for a designated Buyer
    Given a registered Buyer company with a verified wallet
    When the Producer registers the Batch with that Buyer as reserved buyer
    Then the Batch is a Reserved Batch for that Buyer only
    And the index stores the reserved buyer

  @program @db
  Scenario: Register a Spot Batch
    When the Producer registers a Batch without a reserved buyer
    Then the Batch is a Spot Batch

  @api
  Scenario: Indexing requires a verified on-chain Batch
    Given a PDA not owned by the JuLit programme, or a failed or unconfirmed transaction
    When the API receives an indexing request for it
    Then the API rejects the request
    And the index is not modified
