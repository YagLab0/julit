# Issue 03: Dual Buyer Portfolio in /account and /batches

**Status:** closed
**Spec:** `../spec.md`

## Description

Implement dual placement of the buyer portfolio in `/account` and `/batches` in accordance with ADR-0008.

## Acceptance Criteria
- [x] `/account`: `BuyerPortfolioCard` displays aggregate lithium volume (t Li₂CO₃), completed batches count, and direct passport/explorer links.
- [x] `/batches`: `CatalogFilterToggle` allows switching between "En venta" and "Mis compras".
- [x] `OriginModal`: respects the filter mode and displays acquired batches with a "Lote adquirido" badge instead of the buy button.
