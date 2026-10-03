# language: en
# Layer tags: @program = Anchor programme, @api = authenticated API, @db = Supabase schema and RLS, @ui = frontend
Feature: Simulated Settlement
  Completing a Batch records a simulated purchase on Solana. No USDC or other token moves.

  @program @api @db
  Scenario: Complete a Spot Batch
    Given an audited Spot Batch
    And a registered Buyer with a verified wallet
    When the Buyer signs complete_purchase
    And the API verifies the confirmed transaction
    Then the Batch reaches status "completed"
    And the actual buyer and the completion transaction signature are indexed

  @program @db
  Scenario: A Reserved Batch is exclusive
    Given an audited Reserved Batch for a designated Buyer
    When a different registered Buyer attempts the purchase on-chain and in the index
    Then the programme rejects the instruction
    And the database rejects the mismatched buyer

  @program @api
  Scenario: Negative findings do not block purchase
    Given an audited Batch with ESG approval false and EU assessment "non_conformant"
    When its eligible Buyer completes the purchase
    Then the Batch reaches status "completed"
    And the negative findings remain indexed and visible

  @ui
  Scenario: Completion is not a payment
    Given a completed Batch
    When the application presents the completion
    Then it describes it as a simulated settlement
    And it never claims that funds were received

  @db
  Scenario: Completed requires the full audit trail
    When the index tries to mark a Batch "completed" without buyer and completion signature
    Then the database rejects the update
