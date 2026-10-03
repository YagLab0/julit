# JuLit public landing

Status: ready-for-agent

## Problem Statement

A prospective Producer or Buyer opening JuLit's public home page currently sees an English Solana starter screen rather than an explanation of the product. The page does not explain the financial and documentary friction in lithium carbonate commerce, the roles of the Producer, Auditor, and Buyer, or how to explore the existing demo.

The user needs a polished Spanish landing with the spacious photographic composition of the supplied reference, adapted to JuLit's lithium identity. It must communicate a Jujuy-rooted proposition for the global lithium value chain without presenting product vision as implemented functionality. In particular, Simulated Settlement must not appear to transfer USDC, an Audit Certificate's integrity must not imply the truth of its contents, and a Passport must not appear to guarantee official EU certification or regulatory compliance.

## Solution

Replace the public home screen with a seven-section, always-light JuLit landing at the public URL `/`. Use the existing teal identity, licensed salar/lithium photography, an original JuLit wordmark and symbol, spacious rounded compositions, restrained motion informed by Emil Kowalski's design-engineering skill, and a dark closing section.

The approved Spanish hero is **“Del salar al mercado, con evidencia verificable.”** The primary action is **“Explorar demo”**, leading to the existing `/batches` experience. **“Cómo funciona”** links to the process section, and **“Ingresar”** opens the existing `/sign-in` experience.

The seven sections, in order, are:

1. Hero: Jujuy/global positioning, product proposition, primary and secondary actions, and a visible Simulated Settlement disclosure.
2. Problem/solution pairs: financial friction; Audit Certificate integrity; a common reference between actors; and accessible evidence consultation.
3. Three-step proposed process: the Producer registers, the Auditor supplies evidence, and the Buyer reviews and decides.
4. Passport: an original explanatory graphic showing the structure of a Batch Passport, explicitly not a real Batch or functioning verification interface.
5. Participant benefits: distinct Producer and Buyer benefits, with the Auditor's independent role explained.
6. FAQ: current demo capabilities, Simulated Settlement, document-integrity limits, regulatory limits, and public consultation versus wallet-authorized operations.
7. Dark closing section: Jujuy/global positioning and a repeated demo action.

The approved Spanish copy is authoritative. The landing makes the wider product proposition understandable while visibly separating it from the demo available today.

## User Stories

1. As an anonymous visitor, I want to understand JuLit from its public home page without creating a Company Account or connecting a wallet, so that I can evaluate whether the product is relevant to me.
2. As a Producer, I want the landing to address lithium carbonate production and commerce rather than generic renewable energy, so that I recognize the business context immediately.
3. As a Buyer, I want to understand the commercial and evidence benefits of JuLit, so that I can assess its relevance to procurement decisions.
4. As a visitor, I want to see a recognizable JuLit wordmark and original symbol, so that I do not mistake Solana's identity for JuLit's brand.
5. As an international Buyer, I want to understand that JuLit is rooted in Jujuy but addresses the global lithium value chain, so that I do not assume the proposition is limited to local transactions.
6. As a visitor, I want a clear headline and short Spanish introduction, so that I can understand the proposition before reading technical details.
7. As a visitor, I want the demo's Simulated Settlement limitation visible near the initial proposition, so that I do not infer that exploring JuLit sends or receives funds.
8. As a Producer, I want the landing to explain commissions, intermediaries, and immobilized capital as sources of financial friction, so that I understand the problem the settlement proposition addresses.
9. As a Buyer, I want USDC settlement identified as part of the product proposition rather than a demonstrated payment capability, so that I can distinguish intended functionality from current behavior.
10. As a visitor, I want commercial benefits explained without unsupported commission percentages or payment-time guarantees, so that I can evaluate the proposition without misleading statistics.
11. As an Auditor, I want the landing to explain the risk of Audit Certificates circulating in different versions, so that the document-integrity proposition has a concrete purpose.
12. As a Buyer, I want to understand that an Audit Certificate's SHA-256 reference detects changes relative to its recorded version, so that I know what integrity verification establishes.
13. As a Buyer, I want the landing to distinguish document integrity from the truth of the document's claims, so that I do not mistake a matching hash for an independent certification.
14. As a Buyer, I want the landing to acknowledge that document integrity alone does not prove the physical relationship between a sample and a shipment, so that I understand the limits of the evidence.
15. As a Producer, I want to understand how a Passport provides a common reference for the participants, so that I can see how it addresses fragmented records and manual reconciliation.
16. As a visitor, I want public QR consultation described as part of the Passport proposition, so that I understand the intended low-friction consultation experience without assuming it is implemented on the landing.
17. As a Buyer, I want the Passport distinguished from an official EU battery passport and regulatory approval, so that I do not infer automatic legal compliance.
18. As a visitor, I want the proposed process divided into Producer, Auditor, and Buyer steps, so that I understand each participant's responsibility.
19. As a Producer, I want the process explanation to identify Origin, quantity, and Chemical Purity as declared Batch information, so that I understand the registration concept.
20. As a Producer, I want the process explanation to distinguish a Spot Batch from a Reserved Batch, so that I understand open-market and designated-buyer positioning without confusing either with a supply agreement.
21. As an Auditor, I want my independent evaluation and supporting Audit Certificate distinguished from the Producer's declaration, so that the landing does not merge the participants' responsibilities.
22. As a Buyer, I want the proposed review step to emphasize Origin, commercial conditions, and audit evidence before the decision to purchase, so that the process reflects an informed B2B decision.
23. As a visitor, I want to see an explanatory Passport graphic rather than a fabricated Batch, so that I understand the structure without mistaking illustration for recorded evidence.
24. As a Buyer, I want the Passport graphic to identify Origin and Producer fields, so that I understand how provenance is represented.
25. As a Buyer, I want the graphic to identify quantity and Chemical Purity fields, so that I understand the production information represented by the Passport.
26. As a Buyer, I want the graphic to identify Water Footprint and Carbon Footprint fields without invented metrics, so that I understand the environmental information without being shown false results.
27. As an Auditor, I want the graphic to identify the Audit Certificate, integrity reference, and Batch state, so that I understand how evidence and status relate to the Passport.
28. As a visitor, I want the graphic visibly labeled as a conceptual view that does not represent a real Batch, so that its status is unambiguous.
29. As a Producer, I want a dedicated benefits block about presenting Origin and evidence in a common structure, so that I can evaluate JuLit from the production side.
30. As a Buyer, I want a dedicated benefits block about reviewing declarations, documentation, and pending evidence, so that I can evaluate JuLit from the purchasing side.
31. As a visitor, I want concise answers to the main limitations and availability questions, so that I can understand the proposition without searching other application routes.
32. As a visitor, I want to expand and collapse FAQ answers using ordinary disclosure controls, so that I can read the details relevant to me.
33. As a visitor, I want the FAQ to disclose the fictional Producer and Origin identities used in the demo, so that I do not attribute demonstration records to real companies.
34. As a visitor, I want to understand the distinction between proposed wallet-free Passport consultation and wallet-authorized blockchain operations, so that I know which interactions would require a wallet.
35. As a visitor, I want navigation links to the solution, process, Passport, and FAQ sections, so that I can move directly to the information I need.
36. As a visitor, I want the initial demo action to open the existing demo rather than a new sign-up gate, so that I can begin exploring with minimal friction.
37. As an existing Company Account holder, I want the login action to open the existing sign-in experience, so that the landing preserves my established access path.
38. As a visitor who has read the full page, I want another demo action at the close, so that I do not have to return to the hero to continue.
39. As a mobile visitor, I want the same seven sections and factual disclosures as desktop visitors, so that smaller screens do not receive an incomplete proposition.
40. As a mobile visitor, I want cards and participant panels to stack naturally and the brand and primary action to fit, so that I can read and navigate without horizontal scrolling or an unnecessary overlay menu.
41. As a desktop visitor, I want a balanced photographic hero, generous spacing, and a clear section hierarchy, so that the landing feels like a coherent JuLit product presentation rather than a starter template.
42. As a reader using a narrow viewport or increased text size, I want content and actions to remain readable and reachable, so that the layout does not clip essential information.
43. As a keyboard user, I want visible focus and a logical traversal order for links and FAQ controls, so that I can operate the landing without a pointer.
44. As a keyboard user, I want FAQ controls to respond to native keyboard activation without delayed motion, so that reading answers remains immediate.
45. As a screen-reader user, I want semantic landmarks, a coherent heading hierarchy, Spanish language information, and meaningful control names, so that I can navigate and understand the page.
46. As a visitor, I want text over photography to remain legible, so that the hero's visual treatment does not obscure the proposition or its actions.
47. As a screen-reader user, I want informative imagery described and decorative imagery excluded from redundant announcements, so that the visuals do not obstruct the reading experience.
48. As a visitor whose application preference is dark mode, I want the landing to retain its approved light composition, so that its presentation remains consistent.
49. As a returning dApp user, I want visiting the landing to leave my selected application theme unchanged, so that the demo remains in the theme I chose.
50. As a visitor who prefers reduced motion, I want positional and scale animation removed while content remains available, so that the landing does not cause avoidable discomfort.
51. As a pointer user, I want brief purposeful press feedback and restrained entrance motion, so that interactions feel responsive without distracting from the information.
52. As a touch user, I want the interface to avoid persistent hover effects and unnecessary motion after a tap, so that touch interaction does not leave misleading visual states.
53. As a visitor scrolling through the page, I want entrances to happen at most once and never delay interaction, so that the page does not repeatedly replay decoration or block my next action.
54. As a visitor on a limited device, I want the landing to remain readable without loading the demo's 3D map, video, or parallax, so that understanding JuLit does not require graphics capabilities unrelated to the page.
55. As a visitor waiting for client JavaScript, I want the substantive copy, links, and FAQ content present in the rendered document, so that the page does not depend on an animation script becoming ready.
56. As a visitor, I want photographs that do not falsely imply a real customer or installation relationship with JuLit, so that the presentation remains credible.
57. As a visitor, I want trust built through accurate explanations rather than fabricated partner logos, testimonials, or impact statistics, so that I can distinguish evidence from promotion.
58. As a visitor, I want appropriately sized images with reserved layout space, so that media loading does not unexpectedly move the text or actions I am using.
59. As a visitor arriving through search or a browser tab, I want Spanish JuLit page metadata and a coherent favicon, so that I recognize the page before and after opening it.
60. As a visitor exploring a public marketing page, I want no unexpected wallet prompts, payment operations, or new contact form, so that I remain in control of when I enter the application.

## Implementation Decisions

### Experience and module boundaries

- Modify the public landing entry point, its presentation sections, its route-scoped style boundary, and the page's metadata/brand artwork. Preserve existing demo, Company Account, authentication, audit, and Batch-registration behavior.
- Keep the implementation modular around the actual presentation concerns: navigation/hero, problem-solution content, proposed process, conceptual Passport, participant benefits, native FAQ, and closing content. Do not introduce a generic page builder, content-management layer, configuration framework, or new shared component system.
- Replace the starter screen cleanly; do not retain starter copy, obsolete home-screen controls, or a compatibility route for the former home page.
- The landing is a public presentation, not a Company Account, wallet, cluster, or theme-management surface. Remove those visible controls from this page only; retain the existing application services and route behavior.
- Public URL contracts are unchanged: `/` is the landing, `/batches` is the demo, and `/sign-in` is the existing login experience. No new public Passport URL, API endpoint, or redirect contract is introduced.
- Use actual links for navigation. Header section links and the secondary hero action target the corresponding sections in the same document; the main action appears in the header, hero, and close. Avoid eager demo prefetch that brings heavy 3D resources into the landing before the visitor chooses the demo.
- Desktop navigation exposes the section links and login action. On narrow screens, prioritize the JuLit identity and demo action and keep login reachable without requiring a complex menu overlay or hiding substantive content.

### Copy and domain boundaries

- Use the approved Spanish copy, including the seven-section order, all four problem/solution pairs, the three participant steps, both benefit blocks, all five FAQ answers, the closing copy, and page metadata. Developer-facing identifiers and comments remain English.
- The domain concepts remain Batch, Producer, Origin, Auditor, Audit Certificate, Passport, Buyer, Spot Batch, Reserved Batch, and Simulated Settlement. In Spanish UI, use the approved equivalents and explanations; do not introduce competing domain definitions.
- Present USDC settlement and public QR Passport consultation as product propositions. The current demo is not evidence of a real USDC transfer, received funds, operational public Passport verification, or measured payment performance.
- Make the initial simulation disclosure readable without opening an FAQ. Keep the further explanations in their approved process and FAQ contexts rather than burying the only limitation disclosure at the page end.
- Explain SHA-256 as an integrity reference against a recorded document version, not as proof of environmental truth, ESG Certification, regulatory compliance, or physical sample-to-shipment custody.
- Keep the Auditor's EU Battery Regulation Evaluation distinct from official EU certification and automatic legal compliance. A Batch Passport is not an official EU battery passport.
- Do not include the pitch's unsupported commission percentages, 15–45-day release range, sub-second confirmation claim, or any invented commercial, customer, impact, or volume statistic.
- Retain the demo's fictional-identity disclosure. Photography, text, and artwork must not reintroduce real Producer/customer claims removed by the existing demo-identity decision.

### Visual composition and responsive behavior

- Adapt the supplied reference's editorial composition rather than reproducing its renewable-energy subject matter: spacious light surfaces, a large salar/lithium photographic hero, restrained rounded cards, alternating section rhythm, and a dark closing composition.
- Use JuLit's existing teal brand scale and existing typography. Reuse the established semantic surface/text/border tokens and primary, secondary, and eyebrow styling roles. Do not hardcode a competing palette in components or globally retheme the dApp.
- Create a simple original JuLit symbol and coherent wordmark treatment for the page's brand elements and favicon. Do not use Solana's logo as JuLit's identity or extend this task into rebranding every application surface.
- Preserve the same information and ordering across desktop and mobile. Stack the problem/solution cards, process content, Passport composition, and participant panels where horizontal presentation no longer fits.
- Maintain readable line lengths, sufficient spacing, and text contrast over photography and in the dark close. Normal text should meet 4.5:1 contrast and large text 3:1; actionable focus indicators must be clearly visible.
- Use semantic header, navigation, main, section, and footer structure with one main heading and a coherent subordinate heading hierarchy. Links and disclosures must have meaningful Spanish accessible names.
- Use native FAQ disclosure controls. No custom accordion state machine, overlay dependency, height animation, or new UI primitive package is necessary.

### Theme isolation

- The landing remains light regardless of the current application theme or operating-system preference; only its approved closing composition is dark.
- Establish a local semantic-token/style boundary for the landing and a local inverse surface for the close. Do not change the global theme preference, persistent storage, application dark-mode class, shared default theme, or map palette to accomplish the landing's appearance.
- Existing button roles must resolve to appropriate contrast within both local surfaces. A visit to the landing and back to the demo must preserve the previously selected application theme.

### Rendering, assets, and performance

- Prefer a server-rendered presentation with static page metadata using the installed Next.js version's supported APIs. Restrict any new client behavior to the small enhancement necessary for approved one-time entrances; do not make all marketing content a client-only view.
- Content rendering must not be gated by Company Account status, wallet connection, Batch-index availability, or a blockchain response. Existing session infrastructure is not rewritten as part of this feature.
- Use Tailwind CSS v4 plus scoped plain CSS for the theme boundary, composition, and purposeful animation. Do not add an animation dependency solely for this page.
- Do not import or instantiate MapLibre, Three.js, WebGPU effects, video players, or parallax behavior in the landing. The existing demo remains the place to explore the map.
- Use licensed photography whose usage rights are verified before inclusion. Preserve source, author where available, license terms, and required attribution in the asset provenance record; honor any attribution requirement without implying a customer relationship.
- Prefer locally delivered, appropriately sized image assets using the existing framework's image facilities. Reserve their aspect ratios, provide suitable responsive sizing, and avoid delaying the hero image through inappropriate lazy loading. Below-the-fold imagery may load lazily.
- Provide meaningful Spanish alternative text for informative images and empty/decorative treatment for imagery that adds no independent information.
- The Passport graphic is original artwork showing field categories only: Origin and Producer; quantity and Chemical Purity; Water Footprint and Carbon Footprint; Audit Certificate; integrity reference; Batch state. Do not populate invented field values, wallets, hashes, certification outcomes, transaction IDs, or working-looking QR verification codes.
- The conceptual-graphic disclosure must be part of the visible composition. The original process illustration, if used, must explain the participant sequence without inventing a Batch or transaction.
- Publish the approved Spanish title and description and an original JuLit favicon using the installed framework's metadata/icon conventions. Ensure the document identifies Spanish for assistive technology; remove English starter identity from this public entry experience without rewriting unrelated route contracts.
- No database/schema migration, seed change, API contract change, RPC instruction, or new authentication behavior is required.

### Motion

- Apply the installed official Emil design-engineering skill. Each animated element must have an explanation such as immediate feedback, comprehension, or a restrained initial entrance rather than motion for its own sake.
- Use brief press feedback of approximately 160 ms and opacity/short-translation entrances of approximately 200–250 ms. Where multiple related elements enter, a brief 40–60 ms stagger may establish reading order without delaying interaction.
- Favor custom ease-out curves and transitions on explicitly named properties. Do not use blanket transitions, scale-from-zero entrances, unnecessary bounce, or repeated scroll-triggered entrances.
- Entrance animation happens at most once per page visit. Do not impose an animation-dependent waiting period or leave content hidden when enhancement code is unavailable.
- Do not animate keyboard-initiated activation. Restrict pointer hover animation to fine-pointer devices with genuine hover support.
- Under reduced-motion preferences, remove positional and scale motion and smooth scrolling; at most retain a brief non-moving fade where useful. All content and controls remain immediately usable.
- Native FAQ content visibility is not animated through layout-size changes.

## Testing Decisions

### Confirmed seam

The user explicitly confirmed **one browser-level seam: the real public landing at `/` and its user-visible navigation journey**. Verification uses the running application, genuine browser interactions, rendered output, and visual evidence. It is not a mock rendering of individual components.

### What makes a good check

- Check externally observable behavior: whether visitors can read the proposition, reach the intended sections and destinations, operate FAQs, preserve their application theme, and use the page at the agreed responsive and motion boundaries.
- Inspect actual rendered surfaces for hierarchy, contrast, image loading, responsive clipping, focus visibility, conceptual labeling, and honest product/demo presentation. Merely compiling or asserting that a component renders is not sufficient.
- Do not add tests of source text, class names, exact copy strings, section-array lengths, asset wiring, forwarding props, implementation defaults, or snapshots that only re-pin incidental wording.
- Treat the approved copy and claims as content-review acceptance, not brittle permanent string assertions. The absence of fabricated claims is assessed against the approved content and actual presentation.
- No new persistent UI test suite is required for static marketing content. Use a focused throwaway browser smoke and capture visual proof; do not leave exploratory verification scaffolding in the repository.

### Browser acceptance scenarios

1. **Anonymous entry and content:** open `/` in a fresh browser session without a connected wallet. Observe the JuLit hero, the visible simulation note, all seven sections, four problem/solution pairs, the proposed three-actor process, two participant benefit blocks, and the conceptual Passport disclosure. Confirm no wallet/payment prompt or starter screen appears.
2. **Navigation:** activate the section links and secondary hero action and observe the intended section reached. Activate the demo action from its repeated placements and observe navigation to the existing demo URL. Activate login and observe the existing sign-in route. These are navigation checks, not tests of the underlying settlement or Company Account services.
3. **FAQ and keyboard:** traverse controls using Tab, observe focus, activate a FAQ disclosure using native keyboard controls, read its answer, and close it again. Confirm no focus trap, interaction delay, or hidden essential answer. Keyboard activation does not trigger decorative motion.
4. **Visual and responsive:** capture the actual hero, representative problem/solution and Passport sections, and dark close at a desktop viewport around 1440 px wide and a mobile viewport around 390 px wide. Also exercise a narrow viewport around 320 px and enlarged text. Observe no horizontal page overflow, clipped essential controls, illegible overlays, missing disclosures, or lost section order.
5. **Theme round-trip:** select dark mode in the existing dApp, visit the landing, observe its light composition and dark close, return to the demo, and observe the retained dark selection. Repeat with light mode. Capture the landing from the dark-preference case to prove isolation rather than a global forced-theme mutation.
6. **Motion and touch:** observe one-time entrances and immediate pointer feedback; scroll away and back and confirm they do not repeatedly replay. Repeat with reduced motion and touch-device settings, observing no positional/scale motion or sticky hover state and no loss of usable content.
7. **Initial document and enhancement:** observe the initial rendered content and native links/disclosures before or without landing enhancement JavaScript. Inspect the browser's requests before choosing the demo and confirm the landing does not start the 3D/map experience or introduce its heavy resource loading. Reserved media dimensions keep actions and text stable as images arrive.
8. **Metadata and assets:** inspect the document language, Spanish title/description, visible JuLit identity, loaded favicon, image rendering, alternative text, and accessible structure. Review the recorded asset usage rights and the actual conceptual artwork; do not accept an unlicensed image or fabricated evidence as visual polish.

### Modules covered and prior art

- The public landing presentation, its local theme boundary, native FAQ interactions, navigation endpoints, image/artwork presentation, metadata, and motion enhancement are covered through the same page-level seam. Existing destination routes receive only the necessary navigation/theme-regression smoke.
- Existing Vitest tests cover Batch-registration and audit validation behavior; they establish a convention of checking inputs, boundaries, and consumer-visible outcomes, but they are not a reason to introduce landing component-unit tests.
- The existing local integration smoke covers Company Account authentication, API behavior, public Origin reads, and seed invariants. It is backend prior art, not a substitute for visual browser proof and not a script to extend with marketing-string assertions.
- Existing feature scenarios use Given/When/Then for public behavior and access boundaries. Their older mock-data scenario does not override the later prohibition on fabricated demo Batches, and their public Passport scenarios do not bring real verification into this landing's scope.
- After implementation, run the project's existing build, lint, and formatting checks and the focused browser smoke. Repair affected existing contract tests if a real regression occurs; do not claim that a build or an unchanged unit suite proves visual completion.
- Record the exercised scenarios and visual artifacts at delivery, distinguishing observed results from any unavailable runtime or device coverage. No browser scenario has been executed merely by publishing this specification.

## Out of Scope

- Implementing real USDC settlement, token transfers, payment receipt, Delivery-versus-Payment custody, or any new blockchain instruction.
- Implementing a live public Passport, QR verification destination, certificate download/hash comparison workflow, or new Batch/index data access.
- Creating mock Batches, audit findings, environmental metrics, wallets, hashes, transaction history, or claims about actual shipments.
- Adding or changing Company Account onboarding, Producer self-registration, wallet linking, permissions, authentication APIs, Company Contracts, Supabase schemas, migrations, or seeds.
- Retheming or redesigning the demo map, audit, account, sign-in, sign-up, or Batch-registration experiences; changing global application theme preference; broad provider refactoring.
- A dark-mode variant of the landing beyond its approved dark closing section.
- Contact forms, email-delivery systems, invented contact destinations, external legal pages, new signup conversion flows, CMS functionality, localization beyond the approved Spanish surface, analytics, or tracking.
- Video, parallax, a 3D map inside the landing, heavy animation libraries added solely for this feature, elaborate gesture interactions, or a new overlay/navigation framework.
- Fabricated customer logos, testimonials, impact claims, unsupported financial or latency figures, official regulatory-certification claims, or representing Solana's mark as the JuLit brand.
- A new end-to-end framework, permanent static-copy/component snapshot suite, expanded cross-browser certification, or unrelated test-suite cleanup.
- Implementing the landing or generating implementation tickets as part of the specification-writing step.

## Further Notes

- This specification is published in the repository's **local Markdown issue tracker** with the canonical triage state `ready-for-agent`. Nothing is published to GitHub.
- [Approved discovery](./discovery.md) records the interview decisions and explicit final user confirmation. [Approved Spanish copy](./copy.es.md) is the complete end-user text and metadata source, not placeholder content. Both remain companion inputs for implementation.
- The initial visual input is the user-supplied renewable-energy landing screenshot. It supplies composition and spacing references, not permission to copy its solar/wind subject, statistics, partner logos, or testimonial. The supplied problem/solution image and JuLit pitch inform the four commercial/evidence themes; unsupported numerical claims were explicitly rejected during discovery.
- The authoritative [domain glossary](../../GLOSSARY.md) and [frontend rules](../../FRONTEND.md) apply. Relevant guardrails are [simulated completion](../../docs/adr/0002-completion-is-simulated-settlement.md), [auditor declarations and shared evidence](../../docs/adr/0004-auditor-declarations-and-shared-evidence.md), and [fictional demo identities and no fabricated Batches](../../docs/adr/0007-provisioned-origins-and-producers.md).
- The official Emil design-engineering skill is already installed locally for Codex and Claude Code. Its applicable guidance is part of the confirmed design contract; no alternative animation style was requested.
- The installed Next.js server/client, static metadata, and image-delivery guides were consulted for this specification. Implementation must continue to use the project's installed version and heed its API/deprecation guidance rather than assume older framework behavior.
- The exact licensed photograph and original artwork are implementation deliverables to select/create within the approved direction. Usage-rights verification is required; absence of a preselected image is not permission to ship a placeholder or an unverified asset.
- No further product interview is needed. The user confirmed the single browser-level verification seam during `to-spec`.
- Next workflow step: `to-tickets`, followed by `implement`. This specification does not begin either step automatically.
