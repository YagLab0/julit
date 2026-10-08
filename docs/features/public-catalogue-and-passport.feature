# language: en
# Layer tags: @program = Anchor programme, @api = authenticated API, @db = Supabase schema and RLS, @ui = frontend
Feature: Public catalogue, passport and access control
  Anyone reads the catalogue and the passport without an account; companies stay private
  and clients never write to the index or the spec-sheet bucket.

  @db @ui
  Scenario: Catalogue shows the indexed Lots of each Origin
    Given indexed Lots across the lifecycle statuses
    When an anonymous visitor loads the catalogue
    Then each Origin shows its Lots, newest first, with their status
    And reserved lots show that they are designated to a buyer

  @db
  Scenario: Company accounts stay private
    When an anonymous client reads the companies table
    Then the read is denied
    And an authenticated company reading companies receives only its own row

  @db
  Scenario: Clients cannot mutate the index or the spec sheets
    Given an anonymous or authenticated client
    When it updates lots, or inserts, replaces or deletes objects in the spec-sheet bucket
    Then the operation is denied
    But public spec-sheet downloads still work

  @ui
  Scenario: The passport renders the lot lifecycle timeline
    Given the public passport of a Lot at "/batch/<PDA_ADDRESS>"
    When the page renders
    Then it shows the lot status badge and declared metrics
    And it renders the lifecycle timeline — creation, funding, an optional
    dispute flag, and the terminal event — each linked to its Devnet transaction
    And it links the lot spec sheet PDF and its declared SHA-256
    And it never shows the commercial price

  @ui @program
  Scenario: The passport proves itself against Solana
    Given the public passport of a Lot at "/batch/<PDA_ADDRESS>"
    When the page renders
    Then the on-chain account is contrasted field by field with the index row
    And the QR image and the Explorer links are derived, never stored

  @ui
  Scenario: The passport opens fast on mobile
    Given a mobile visitor opening "/batch/<PDA_ADDRESS>"
    When the page loads
    Then it renders without the 3D map
    And it is usable in under about one second
