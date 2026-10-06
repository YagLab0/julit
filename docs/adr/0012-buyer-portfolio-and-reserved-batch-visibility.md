# Buyer portfolio dual placement and reserved batch public visibility

Completed batches record the actual purchasing company's verified wallet in `buyer_wallet`. Buyer companies require immediate access to their acquired inventory to support ESG reporting, Scope 3 emission accounting, and European Union battery regulation due diligence.

The buyer portfolio is exposed in two locations:

1. **Company account (`/account`)**: A dedicated acquired batches section displays aggregate volume (tonnes), transaction confirmation details, and links to public passports for all batches completed by the authenticated company.
2. **Catalog exploration (`/batches`)**: A filter toggle allows authenticated buyers to view their completed batches alongside batches currently offered for sale, maintaining consistent search and sorting across the 3D map and list views.

A reserved batch restricts `complete_purchase` exclusively to its designated client's verified wallet. However, public transparency remains uncompromised: any visitor or unassigned buyer may inspect the batch's origin, production metrics, chemical purity, and audit certificate on both the catalog and its dedicated `/batch/<PDA_ADDRESS>` passport route. For unauthorized wallets, the purchase control displays a visible disabled indicator ("Reservado para otra empresa") rather than hiding the batch from public view.

All buyer interactions maintain the simulated settlement model defined in ADR-0002. Neither the catalog nor the account portfolio presents batch completion as evidence of token or fund movement.
