# language: en
# Layer tags: @program = Anchor programme, @api = authenticated API, @db = Supabase schema and RLS, @ui = frontend
Feature: Atomic lot settlement in escrow
  The designated Buyer funds a reserved Lot; the escrowed USDC sits in the
  lot-owned escrow until the buyer's receipt confirmation or the claim
  deadline releases it — the Digital Title is burned inside escrow in the
  same transaction. No funds move outside these transitions.

  Background:
    Given a "listed" Lot reserved for a Buyer at a fixed USDC price
    And the protocol Config holds a take rate in basis points

  @program @api @db
  Scenario: The designated buyer funds the lot
    Given the Buyer's USDC ATA holds at least the lot price
    When the Buyer signs fund_lot
    Then exactly price_usdc moves from the buyer ATA into the lot escrow ATA
    And the Lot becomes "funded"
    When the API verifies the confirmed transaction and the on-chain status
    Then the index writes "funded" and the fund transaction signature

  @program
  Scenario: Only the designated buyer may fund
    When any other wallet signs fund_lot for the Lot
    Then the programme rejects the instruction

  @program @api @db
  Scenario: The buyer confirms receipt and the escrow settles
    Given a "funded" Lot
    When the Buyer signs redeem_lot
    Then the Digital Title is burned inside its escrow
    And the escrow pays price minus the take rate to the producer ATA
    And the escrow pays the take rate to the treasury ATA
    And the Lot becomes "redeemed"
    When the API verifies the confirmed transaction and the on-chain status
    Then the index writes "redeemed" and the redeem transaction signature

  @program
  Scenario: Settlement is atomic
    Given a "funded" Lot
    When any CPI inside redeem_lot fails
    Then the whole transaction reverts
    And neither the title nor the escrowed USDC moves

  @program @api @db
  Scenario: The producer collects after an unresponsive buyer's deadline
    Given a "funded" Lot whose claimable_after has passed
    When the Producer signs claim_timeout
    Then the Digital Title is burned and the escrow splits like a redeem
    And the Lot becomes "claimed"

  @program
  Scenario: The producer cannot collect before the deadline
    Given a "funded" Lot whose claimable_after has not passed
    When the Producer signs claim_timeout
    Then the programme rejects the instruction

  @program
  Scenario: A disputed lot resolves only by the buyer's release
    Given a "disputed" Lot
    When the Buyer signs redeem_lot
    Then the escrow releases to the producer minus the take rate
    And the Lot becomes "redeemed"
    And no refund or arbiter path exists on-chain

  @program @api @db
  Scenario: The producer cancels an unfunded reservation
    Given a "listed" Lot the buyer never funded
    When the Producer signs cancel_lot
    Then the Digital Title is burned inside its escrow
    And the Lot becomes "cancelled"

  @program
  Scenario: A funded lot can never be cancelled
    Given a "funded" Lot
    When the Producer signs cancel_lot
    Then the programme rejects the instruction

  @api
  Scenario Outline: The index never writes an unverified transition
    Given a lot index row in any status
    When the API receives a <transition> request with a missing, failed or foreign transaction
    Then the API rejects the request
    And the index row keeps its status

    Examples:
      | transition |
      | fund       |
      | redeem     |
      | claim      |
      | cancel     |
