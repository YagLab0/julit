# language: en
# Layer tags: @program = Anchor programme, @api = authenticated API, @db = Supabase schema and RLS, @ui = frontend
Feature: Public catalogue, passport and access control
  Anyone reads the catalogue and the passport without an account; companies stay private
  and clients never write to the index or the certificate bucket.

  @db @ui
  Scenario: Catalogue shows the indexed Batches of each Origin
    Given indexed Batches in statuses "created", "audited" and "completed"
    When an anonymous visitor loads the catalogue
    Then each Origin shows its Batches, newest first, with their status
    And negative ESG or EU findings are displayed explicitly when audited

  @ui
  Scenario: Mock data is labelled
    Given the catalogue is served from mock data
    When a visitor opens it
    Then a visible demo notice is displayed

  @db
  Scenario: Company accounts stay private
    When an anonymous client reads the companies table
    Then the read is denied
    And an authenticated company reading companies receives only its own row

  @db
  Scenario: Clients cannot mutate the index or the certificates
    Given an anonymous or authenticated client
    When it updates batches, or inserts, replaces or deletes objects in the certificate bucket
    Then the operation is denied
    But public certificate downloads still work

  @ui @program
  Scenario: The passport proves itself against Solana
    Given the public passport of a certified Batch at "/batch/<PDA_ADDRESS>"
    When the visitor verifies the certificate
    Then the SHA-256 of the downloaded bytes is compared with the on-chain digest
    And the cached index JSON is not treated as canonical
    And the QR image and the Explorer link are derived, never stored

  @ui
  Scenario: The passport opens fast on mobile
    Given a mobile visitor opening "/batch/<PDA_ADDRESS>"
    When the page loads
    Then it renders without the 3D map
    And it is usable in under about one second
