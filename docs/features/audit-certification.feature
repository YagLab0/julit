# language: en
# Layer tags: @program = Anchor programme, @api = authenticated API, @db = Supabase schema and RLS, @ui = frontend
Feature: Audit certification
  The designated Auditor certifies one Batch with a single public audit certificate
  covering the ESG Certification and the EU Battery Regulation Evaluation.

  @api @db
  Scenario: Upload the certificate before certifying
    Given the designated Auditor computed the SHA-256 of the certificate locally
    When the designated Auditor uploads the certificate through the authenticated API
    Then the API verifies the uploader is the designated Auditor of that Batch
    And the API recomputes the uploaded file digest
    And the certificate is stored at "<PDA_ADDRESS>/<lowercase digest>.pdf" without upsert

  @api
  Scenario: Reject a certificate from an uninvited Auditor
    Given a registered Auditor that is not the designated Auditor of the Batch
    When that Auditor attempts to upload a certificate for the Batch
    Then the API rejects the request
    And no object is stored

  @program @api @db
  Scenario: Record negative findings as Audited
    Given a certificate whose digest matches the on-chain asset
    When the designated Auditor certifies the Batch with ESG approval false and EU assessment "non_conformant"
    And the API verifies the confirmed on-chain audit result against the current PDA
    Then the Batch reaches status "audited"
    And the digest, both findings and the certification transaction signature are indexed

  @program
  Scenario: Certify only once
    Given a Batch whose designated Auditor already certified it
    When any certify instruction is submitted again for that Batch
    Then the programme rejects the instruction

  @db
  Scenario: Audited requires complete audit evidence
    When the index tries to mark a Batch "audited" without digest, findings or certification signature
    Then the database rejects the update

  @api
  Scenario: Only confirmed on-chain results populate the index
    Given a submitted audit result whose transaction is not confirmed on Devnet
    When the API processes the indexing request
    Then the index keeps the previous status
