# Spec: Landing pivot to atomic lot settlement

Status: ready-for-agent

## Problem Statement

A visitor opening JuLit's public home page sees a landing written for the pre-pivot product: a Producer–Auditor–Buyer process, an Audit Certificate per batch, Simulated Settlement, and a Passport framed as audited evidence. The pivot (`atomic-lot-settlement`) removed the auditor entirely and made the product a B2B directory plus an atomic delivery-vs-payment settlement protocol: every Lot is born reserved to a Designated Buyer, tokenized as a Digital Title held in Escrow, settled atomically, and closed by Redemption on Physical Delivery.

The landing must tell the new story without overstating it: demo tokens carry no value, the Digital Title is not automatic legal title, Plant Certificate Verification proves document integrity rather than truth, and Physical Delivery stays off-chain. Because the landing ships ahead of the pivoted demo, its publication is gated on the new demo being ready — not by code, but by a release rule.

## Solution

Rewrite the public landing at `/` to the pivot model, keeping the approved composition: photographic salar hero, spacious light surfaces with the teal identity, native FAQ disclosure, team section, and dark close. The narrative follows the lifecycle "Descubrimiento → Tokenización → Liquidación → Entrega → Redención" with plain-Spanish-first language — "título digital", "liquidación atómica (entrega contra pago)" — and technical terms (NFT, USDC, Solana Devnet) in step descriptions and the FAQ.

The page keeps eight sections: hero; problem/solution pairs; a single five-step lifecycle chain replacing the three process widgets (the auditor-report widget dies with the role, and the big-bag 3D is retired with it); a redefined Passport section — the public record of the lot's Digital Title and lifecycle rather than audited evidence; Producer and Buyer benefit blocks (the Auditor block is removed); a rewritten FAQ; team; and dark close. The hero headline direction keeps "Del salar al mercado" continuity with settlement added: "Del salar al mercado, con liquidación atómica." The primary action remains **Explorar demo**, targeting the new demo surface, **explorer** (`/explorer`).

The approved Spanish copy draft lives at `.scratch/landing-pivot/copy.es.md` and is pending user approval. All decisions from the grill are recorded in `.scratch/landing-pivot/discovery.md`.

## User Stories

1. As an anonymous visitor, I want to understand JuLit's settlement proposition from its public home page without creating a Company Account or connecting a wallet, so that I can evaluate whether the product is relevant to me.
2. As a Producer, I want the landing to address lithium carbonate commerce between companies, so that I recognize the business context immediately.
3. As a Buyer, I want to understand that payment and title exchange happen in one transaction, so that I can assess the settlement proposition.
4. As a visitor, I want a recognizable JuLit wordmark and symbol, so that I do not mistake another project's identity for JuLit's.
5. As an international Buyer, I want to understand that JuLit is rooted in Jujuy but addresses the global lithium value chain, so that I do not assume the proposition is local only.
6. As a visitor, I want the demo's Devnet nature visible near the initial proposition, so that I do not infer that exploring JuLit moves funds of real value.
7. As a visitor, I want the demo disclosure to distinguish real transactions from valueless test tokens, so that I understand what is and isn't simulated.
8. As a Producer, I want settlement risk explained as the problem of paying before receiving or delivering before being paid, so that I understand what atomic settlement removes.
9. As a Buyer, I want USDC settlement described as part of the demonstrated proposition on Devnet, so that I can distinguish demo scope from production claims.
10. As a visitor, I want benefits explained without invented statistics, commission percentages, or payment-time guarantees, so that I can evaluate the proposition without misleading numbers.
11. As a visitor, I want the claim framed as eliminating settlement risk rather than counterparty risk, so that I am not misled about what the protocol guarantees.
12. As a Buyer, I want to understand that a lot's Digital Title represents a contractual right over the lot, so that I do not mistake it for automatic legal title.
13. As a Producer, I want to understand that certification is declared at plant level rather than audited per lot, so that the model matches how my operation certifies.
14. As a Buyer, I want Plant Certificate Verification explained as a hash check against the recorded document version, so that I know what integrity verification establishes.
15. As a Buyer, I want the landing to distinguish document integrity from the truth of the document's contents, so that I do not mistake a matching hash for independent certification.
16. As a visitor, I want the five-step lifecycle presented with on-chain and off-chain steps distinguished, so that I understand what the protocol does and does not cover.
17. As a Producer, I want tokenization explained as creating the Digital Title and placing it in protocol custody, so that I understand what registering a lot does.
18. As a Buyer, I want the settlement step to identify that only the Designated Buyer executes it, so that I understand the reserved-lot model.
19. As a Buyer, I want the redemption step explained as confirming Physical Delivery by burning the title, so that I understand how the lifecycle closes.
20. As a visitor, I want Physical Delivery identified as off-chain, so that I do not expect the protocol to move cargo.
21. As a visitor, I want to understand that every Lot is born reserved to a Designated Buyer, so that I do not expect an open marketplace.
22. As a visitor, I want to see an explanatory Passport composition rather than a fabricated Lot, so that I understand the structure without mistaking illustration for recorded data.
23. As a Buyer, I want the Passport composition to identify lot, origin, and producer fields, so that I understand how provenance is represented.
24. As a Buyer, I want the composition to identify quantity, Chemical Purity, and Lot Price fields, so that I understand the commercial and production information represented.
25. As a Buyer, I want the composition to identify the Plant Certificate and its integrity reference, so that I understand where certification evidence lives in the new model.
26. As a visitor, I want the composition to identify the Digital Title and its custody, so that I understand what is tokenized.
27. As a visitor, I want the composition to identify the lifecycle status (listed, settled, redeemed) and the create/settle/redeem transactions, so that I understand the Passport as a lifecycle record.
28. As a visitor, I want the composition visibly labeled as a conceptual view that does not represent a real Lot, so that its status is unambiguous.
29. As a Producer, I want a dedicated benefits block about being paid in the same transaction that delivers the title, so that I can evaluate JuLit from the production side.
30. As a Producer, I want the plant certificate described as declared once and referenced by each lot, so that I understand the reduced documentary load.
31. As a Buyer, I want a dedicated benefits block about paying only if the title arrives in the same transaction, so that I can evaluate JuLit from the purchasing side.
32. As a Buyer, I want the redemption benefit explained as closing the cycle with permanent evidence, so that I understand the post-settlement value.
33. As a visitor, I want the take rate absent from the marketing surface, so that protocol economics do not crowd the participant proposition.
34. As a visitor, I want concise answers to the main limitation and availability questions, so that I can understand the proposition without searching other routes.
35. As a visitor, I want to expand and collapse FAQ answers using ordinary disclosure controls, so that I can read the details relevant to me.
36. As a visitor, I want the FAQ to disclose the fictional identities used in the demo, so that I do not attribute demonstration records to real companies.
37. As a visitor, I want a FAQ entry explaining that no open purchase exists, so that I understand the always-reserved model.
38. As a visitor, I want a FAQ entry explaining what the Digital Title is and is not, so that legal-title assumptions are corrected.
39. As a visitor, I want a FAQ entry distinguishing transaction reality from token value, so that the demo's Devnet scope is clear.
40. As a visitor, I want navigation links to the solution, process, Passport, FAQ, and team sections, so that I can move directly to the information I need.
41. As a visitor, I want the demo action to open the explorer surface, so that I can begin exploring with minimal friction.
42. As an existing Company Account holder, I want the login action to open the existing sign-in experience, so that the landing preserves my established access path.
43. As a visitor who has read the full page, I want another demo action at the close, so that I do not have to return to the hero to continue.
44. As a mobile visitor, I want the same sections and factual disclosures as desktop visitors, so that smaller screens do not receive an incomplete proposition.
45. As a mobile visitor, I want cards, the lifecycle chain, and participant panels to stack naturally, so that I can read and navigate without horizontal scrolling.
46. As a desktop visitor, I want a balanced photographic hero, generous spacing, and a clear section hierarchy, so that the landing feels like a coherent product presentation.
47. As a reader using a narrow viewport or increased text size, I want content and actions to remain readable and reachable, so that the layout does not clip essential information.
48. As a keyboard user, I want visible focus and a logical traversal order for links and FAQ controls, so that I can operate the landing without a pointer.
49. As a keyboard user, I want FAQ controls to respond to native keyboard activation without delayed motion, so that reading answers remains immediate.
50. As a screen-reader user, I want semantic landmarks, a coherent heading hierarchy, Spanish language information, and meaningful control names, so that I can navigate and understand the page.
51. As a visitor, I want text over photography to remain legible, so that the hero's visual treatment does not obscure the proposition or its actions.
52. As a screen-reader user, I want informative imagery described and decorative imagery excluded from redundant announcements, so that the visuals do not obstruct reading.
53. As a visitor whose application preference is dark mode, I want the landing to retain its approved light composition, so that its presentation remains consistent.
54. As a returning dApp user, I want visiting the landing to leave my selected application theme unchanged, so that the demo remains in the theme I chose.
55. As a visitor who prefers reduced motion, I want positional and scale animation removed while content remains available, so that the landing does not cause avoidable discomfort.
56. As a pointer user, I want brief purposeful press feedback and restrained entrance motion, so that interactions feel responsive without distraction.
57. As a visitor scrolling through the page, I want entrances to happen at most once and never delay interaction, so that the page does not replay decoration or block my next action.
58. As a visitor waiting for client JavaScript, I want the substantive copy, links, and FAQ content present in the rendered document, so that the page does not depend on an enhancement script.
59. As a visitor, I want photographs that do not falsely imply a real customer or installation relationship with JuLit, so that the presentation remains credible.
60. As a visitor, I want appropriately sized images with reserved layout space, so that media loading does not unexpectedly move the text or actions I am using.
61. As a visitor arriving through search or a browser tab, I want Spanish JuLit page metadata and a coherent favicon, so that I recognize the page before and after opening it.
62. As a visitor exploring a public marketing page, I want no unexpected wallet prompts, payment operations, or new contact form, so that I remain in control of when I enter the application.
63. As a visitor, I want the lifecycle chain readable as a connected sequence, so that the five-step narrative is graspable without studying each step separately.
64. As a visitor on a limited device, I want the landing readable without loading 3D graphics, so that understanding JuLit does not require capabilities unrelated to the page.

## Implementation Decisions

### Experience and module boundaries

- Modify the public landing entry point and its presentation sections only. Preserve existing demo, Company Account, authentication, contract, and lot-registration behavior.
- Keep the implementation modular around the actual presentation concerns: navigation/hero, problem-solution content, lifecycle chain, conceptual Passport, participant benefits, native FAQ, team, and closing content. No page builder, CMS layer, or new shared component system.
- Remove the three existing process widgets entirely: the auditor-report widget is obsolete with the role, and the big-bag 3D widget is retired with them — a single lifecycle chain carries the section. The Three.js dependency itself remains for application surfaces outside the landing.
- The landing is a public presentation, not a Company Account, wallet, cluster, or theme-management surface.
- Public URL contracts: `/` is the landing, `/sign-in` is the existing login experience, and the demo action targets the explorer surface (`/explorer`). If the final explorer route differs at implementation time, the CTA follows it; the spec does not freeze the path.
- Publication rule: the pivoted landing is not deployed publicly before the new demo surface is ready. This is a release-ordering decision, not conditional code — the copy includes the demo CTA unconditionally.
- Use actual links for navigation. Header section links and the secondary hero action target sections in the same document; the main action appears in the header, hero, and close. No eager prefetch of heavy demo resources.
- Desktop navigation exposes the section links and login action; on narrow screens, prioritize the JuLit identity and demo action and keep login reachable without a complex menu overlay.

### Copy and domain boundaries

- The copy draft at `copy.es.md` is the starting point and requires user approval before implementation; once approved it is authoritative. Developer-facing identifiers and comments remain English.
- Domain language follows the rewritten `GLOSSARY.md`: Lot, Digital Title, Escrow, Atomic Settlement, Take Rate, Redemption, Physical Delivery, Designated Buyer, Plant Certificate, Plant Certificate Verification, Passport, Explorer, dUSDC. Auditor, Audit Certificate, Spot/Reserved Batch, Simulated Settlement, and ESG/EU-evaluation language do not appear.
- Spanish UI uses plain language first — "título digital", "liquidación atómica (entrega contra pago)", "custodia del protocolo" — with NFT, USDC, and Solana Devnet named in step descriptions and the FAQ.
- Claims discipline: the landing may say it eliminates settlement risk, never counterparty risk; the Digital Title represents a contractual right, not automatic legal title; Plant Certificate Verification proves document integrity, not the truth of contents; Physical Delivery is off-chain.
- The demo disclosure states that transactions are real but tokens carry no value — replacing the old "simulated settlement, no transfer" framing.
- Retain the fictional-identity disclosure. Photography, text, and artwork must not reintroduce real Producer/customer claims.
- Do not include unsupported statistics, commission percentages, or payment-time guarantees; the take rate does not appear on the landing.

### Visual composition and responsive behavior

- Keep the existing composition: salar photographic hero, light surfaces, teal scale, restrained rounded cards, dark close. Reuse established semantic tokens and styling roles; do not retheme.
- The lifecycle chain is a single connected five-step sequence with on-chain steps visually distinguished from off-chain ones (Discover and Deliver are off-chain; Tokenize, Settle, Redeem are on-chain). It stacks or scrolls naturally on narrow viewports.
- The Passport section keeps its editorial technical-document treatment and sequential accent motion, with the new six-row content and its "conceptual view" disclaimer.
- The participant-benefit diagrams keep their orbital treatment, adapted to Producer and Buyer copy; the auditor content is removed.
- Preserve the same information and ordering across desktop and mobile. Maintain readable line lengths, spacing, and contrast; normal text 4.5:1, large text 3:1.
- Semantic header, navigation, main, section, footer structure with one main heading and coherent subordinate hierarchy; meaningful Spanish accessible names.
- Native FAQ disclosure controls; no custom accordion state machine or new UI primitive package.

### Theme isolation

- The landing remains light regardless of application theme or OS preference; only the closing composition is dark.
- Keep the existing local semantic-token boundary and inverse surface for the close. Do not change the global theme preference, persistent storage, or application dark-mode class.
- A visit to the landing and back preserves the previously selected application theme.

### Rendering, assets, and performance

- Prefer server-rendered presentation with static page metadata; restrict client behavior to the small enhancement for approved one-time entrances and the lifecycle/Passport accents. Do not make all marketing content client-only.
- Content rendering must not be gated by Company Account status, wallet connection, index availability, or a blockchain response.
- Reuse the existing motion controller (visibility pausing, reduced-motion, keyboard cancellation, cleanup). No new animation dependency.
- The landing must not load the demo's 3D map or batch-showcase resources; with the big-bag widget retired, no WebGL loads on this page.
- Update page metadata title and description to the new copy. Keep favicon and brand artwork.

## Testing Decisions

A good test verifies external behavior of the real page — what an anonymous visitor sees and can do — never copy strings, class names, or component structure.

- **Single seam: the public landing page `/` rendered in the running application**, exercised through browser scenarios. This is the same seam the original landing used; `docs/landing.md` documents the pattern, and there is prior art in the approved browser scenarios (anonymous content, navigation, native FAQ/keyboard operation, responsive presentation, theme round-trips, motion, initial document content, metadata/assets).
- Scenarios to cover: anonymous rendering of all eight sections; hero disclosure legibility; lifecycle chain ordering and on-chain/off-chain distinction; Passport conceptual disclaimer; FAQ disclosure by pointer and keyboard; section-link navigation; CTA and login targets; desktop/mobile/narrow viewports; light-theme isolation and theme round-trip back to the demo; reduced-motion and one-time entrances; Spanish metadata.
- Build and lint run as mechanical checks; their success alone does not establish visual completion. No static-copy snapshots, no source/class-name assertions, no new test infrastructure.
- No unit tests: the feature introduces no testable logic beyond presentation.

## Out of Scope

- Implementing the pivot itself: the Anchor program (`create_lot`, `settle_lot`, `redeem_lot`), schema changes, API routes, and the explorer demo surface are owned by the `atomic-lot-settlement` spec, not this one.
- The `/explorer` route and any demo surface changes beyond the landing's outbound link.
- Rebranding or retheming application surfaces outside the public landing.
- New registration, wallet, payment, or verification flows on the landing.
- Updating `docs/landing.md` — it describes the superseded landing contract and is rewritten when this feature lands.
- Public deployment sequencing mechanics; the publication rule is recorded, not enforced in code.

## Further Notes

- Grill outcomes and rationale: `.scratch/landing-pivot/discovery.md`.
- Pivot decisions are recorded in ADRs 0014–0018; ADRs 0001, 0002, and 0004 are superseded. The renumbering that resolved the 0008/0009 collision (portfolio → 0012, passport scope → 0013) is also in the discovery file.
- Source material: `.scratch/atomic-lot-settlement/pivot-changes.pdf` and its spec.
- The old landing spec (`.scratch/landing/`) and its copy remain as historical record; this spec supersedes them for the `/` surface.
