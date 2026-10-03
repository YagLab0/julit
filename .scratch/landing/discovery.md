# JuLit landing discovery

Status: interview completed and explicitly confirmed by the user. This is an agreed discovery record, not an implementation specification.

## Explicit requirements

- The landing page lives at `/`.
- Use Tailwind CSS, with plain CSS where needed.
- Develop Spanish end-user copy using the supplied JuLit pitch and bottleneck-to-solution reference.
- Use the supplied renewable-energy landing screenshot as a visual reference; the subject remains lithium carbonate and JuLit.
- Follow grill-with-docs → to-spec → to-tickets → implement. Do not implement during discovery.

## Reference material

- Supplied `pitch v0.pdf`: JuLit is presented as a B2B lithium-carbonate settlement protocol and digital passport on Solana.
- Supplied problem/solution image: bank payment friction, audit-document integrity, disconnected records, and public QR verification.
- Supplied visual reference: spacious light surfaces, large photographic hero, rounded blocks, a green accent, feature grid, alternating content sections, and a dark closing section.

## Existing product boundaries

- `app/page.tsx` currently renders a starter screen; replacing it is the requested landing scope.
- `FRONTEND.md` defines Tailwind v4, semantic theme tokens, existing button classes, and Spanish UI strings.
- `docs/adr/0002-completion-is-simulated-settlement.md` defines completion as simulated settlement without a USDC transfer. The pitch describes a broader product vision, not proof of implemented payments or measured latency.
- `GLOSSARY.md` distinguishes a public batch passport from an audit certificate and distinguishes an auditor's regulatory evaluation from automatic legal compliance or official EU certification.
- `docs/adr/0007-provisioned-origins-and-producers.md` requires fictional demo producer/origin identities rather than attributing demo data to real companies.

## Agreed decisions — round 1

- Primary audience: producers and B2B buyers. Auditors participate in the process but are not the primary conversion audience.
- Positioning: present the broader product proposition and the current demo with explicit distinctions. Do not present simulated settlement as a real USDC payment or claim measured sub-second settlement.
- Visual direction: preserve the reference's spacious, light editorial composition while using JuLit-specific lithium/salar imagery and the existing teal brand identity.
- Visual sources: licensed photography plus original process graphics. Verify usage rights; do not imply that photographed installations or real companies are JuLit customers.

## Agreed decisions — round 2

- Primary conversion: `Explorar demo` links to `/batches`. Accompanying actions are `Cómo funciona` as an in-page link and `Ingresar` linking to `/sign-in`.
- Content depth: seven sections — hero; four problem/solution pairs; three-step process; digital passport; producer/buyer benefits; FAQ; closing CTA.
- Theme: the landing remains light with a dark closing section. It must not alter the dApp's selected theme.
- Brand: create a simple JuLit wordmark and original symbol, including a coherent favicon rather than retaining Solana's mark as JuLit's identity.
- Animation guidance: the user requested installation and use of the official `emil-design-eng` skill from `emilkowalski/skills`.
- Skill installation completed locally for Codex and Claude Code using `npx --yes skills add https://github.com/emilkowalski/skills --skill emil-design-eng --agent claude-code codex --yes`; the CLI reported one installed skill and a Claude Code symlink.
- The installed skill's applicable guidance favors purposeful motion, brief responsive transitions, custom ease-out curves, transform/opacity animation, short stagger delays, reduced-motion support, and hover effects limited to fine pointers. It does not require an animation library.

## Agreed decisions — round 3

- Geographic positioning: JuLit is rooted in Jujuy and addresses the global lithium value chain.
- Claims: retain the pitch's financial-friction argument without unsourced commission percentages, release-time ranges, or sub-second performance guarantees.
- Passport section: an explanatory product graphic, not a live verification interface. Do not invent batches, certification results, numerical metrics, or working-looking verification QR codes.
- Domain boundary: JuLit's batch Passport is not an official EU battery passport or a guarantee of regulatory compliance. Document integrity is not a guarantee that an audit's claims are true or that a physical shipment matches its sample.

## Confirmed delivery contract

- Copy tone: clear, professional Spanish for B2B readers; lead with commercial and evidence benefits, explain Solana, USDC, and hashes only where useful.
- Navigation: JuLit wordmark; in-page links to solution, process, passport, and FAQ; `Ingresar` to `/sign-in`; primary `Explorar demo` to `/batches`.
- Secondary hero CTA: `Cómo funciona` to the process section. Repeat the primary demo CTA at the close.
- Mobile: preserve the same content and order; stack cards and role panels; keep the brand and primary CTA visible without requiring a complex navigation overlay.
- Accessibility: semantic headings, visible focus, usable keyboard navigation, readable text over photography, native FAQ disclosure controls, and respect for reduced motion.
- Motion informed by Emil's skill: approximately 160 ms press feedback; 200–250 ms opacity/short-translation entrances; brief 40–60 ms stagger where helpful; animate once rather than on every scroll. No animated keyboard activation, no interaction delays, and no movement under reduced-motion preferences.
- Use Tailwind and scoped plain CSS where needed. Prefer existing typography, semantic tokens, and button roles. Do not retheme application routes as a side effect.
- Exclude new payment, blockchain, authentication, contact-form, or live-passport functionality. Do not add fake partner logos, customer testimonials, impact statistics, external contact destinations, or legal links.
- Do not load the 3D map, video, or parallax into the landing. Original passport/process diagrams illustrate structure rather than fabricated records.
- Include Spanish page metadata and a JuLit favicon; preserve the existing application routes and their behavior.
- Photography selection must retain its source and verified usage rights; imagery must not imply customer relationships.
- Full approved end-user copy is recorded separately in `copy.es.md`.

## Final confirmation and next step

The user selected `Confirmar copy y alcance` after reviewing the seven-section copy summary and visual/behavioral scope. All interview branches are resolved; the copy and delivery contract are approved.

Run `to-spec` next using this discovery record and `copy.es.md`. Follow with `to-tickets`, then `implement`. No landing application code was changed during discovery.

Existing Passport, Audit Certificate, Simulated Settlement, and EU Battery Regulation Evaluation terms remain authoritative. The Passport glossary entry is clarified rather than introducing a competing term or glossary. No new ADR is needed: the relevant demo and regulatory boundaries are already recorded, and the visual choices do not meet the ADR criteria.
