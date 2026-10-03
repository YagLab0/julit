# Landing process widgets discovery

Status: discovery resolved through the user interview. This record is not an implementation specification.

## User requirements

- Make the existing landing more visually engaging with animated widgets.
- Add a 3D representation of a lithium-carbonate batch, not the existing mine/salar diorama.
- Place three process widgets in the existing “Del registro a la decisión de compra” section.
- Represent the physical batch as an industrial big bag.

## Proposed composition

Keep the photographic hero and the existing three-stage process order:

1. Producer registration: an illustrative 3D industrial big bag with white fabric, lifting loops, and a Li₂CO₃ marking, accompanied by origin, quantity, and purity field categories.
2. Auditor evidence: an illustrative report linked to the batch through animation.
3. Buyer review: an illustrative passport assembling origin, conditions, and evidence for review.

These visual descriptions are the proposed design direction, not new product functionality or a physical packaging specification.

## Existing constraints

- Preserve Spanish end-user copy and English code, identifiers, and technical documentation.
- Preserve the landing's local light theme, dark closing section, existing routes, and application theme preference.
- Keep substantive content available without animation or JavaScript enhancements.
- Respect reduced-motion preferences; the widgets must remain understandable without movement.
- Do not invent batch records, quantities, purity values, audit findings, certification, hashes, QR codes, payment execution, or performance claims.
- The demo does not transfer funds. Buyer animation represents review and a decision, not an executed purchase or settlement.
- Document integrity does not prove report truth, physical correspondence, or regulatory compliance.
- The existing Three.js mine model represents an origin, not packaged lithium carbonate; do not relabel it as a batch.
- This enhancement supersedes the previous exclusion of landing 3D only for the illustrative batch widget. It does not introduce the 3D map.

## Specification questions

Resolve the precise motion sequence, responsive composition, 3D rendering/loading strategy, and accessible static presentation in the specification using existing dependencies and design guidance. No additional live-data or transactional behavior is requested.

## Next step

Run `to-spec` for this enhancement, then `to-tickets`, then `implement`, as required by the repository workflow. No application code was changed during discovery.
