# language: en
# Layer tags: @program = Anchor programme, @api = authenticated API, @db = Supabase schema and RLS, @ui = frontend
Feature: Company account and verified wallet
  Every participant is a Company of exactly one type with at most one verified wallet,
  registered through the authenticated API and proven by a domain-bound signed message.

  @api @db
  Scenario: Register a company from the authenticated session
    Given a Supabase Auth user without a company profile
    When the API receives a registration with a name and a company type
    Then the company is created with the authenticated user id
    And the company has no wallet yet

  @api
  Scenario: Reject a registration for another account
    When the API receives a registration naming a user id other than the authenticated session
    Then the API rejects the request
    And no company is created

  @api @db
  Scenario: Link a wallet by proving ownership
    Given a registered company without a wallet
    When the company signs a domain-bound message, with expiry and replay protection, using its wallet
    And the API verifies the signature against the submitted wallet
    Then the wallet and its verification timestamp are recorded for that company

  @api
  Scenario: Reject an unproven wallet link
    Given a registered company without a wallet
    When a link request carries an invalid, expired or replayed signature
    Then the API rejects the request
    And the company keeps no wallet

  @db
  Scenario: Reject a wallet already linked elsewhere
    Given a company that already verified a wallet
    When another company tries to link the same wallet
    Then the database rejects the second link

  @db
  Scenario: Freeze a verified identity
    Given a company with a verified wallet
    When anyone tries to replace the wallet, change the company type, or reassign the company to another account
    Then the database rejects the change
