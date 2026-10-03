# Animated landing process widgets

## Problem Statement

The landing's three-stage process is text-only. Visitors need a more engaging visual explanation of batch registration, auditor evidence, and buyer review.

## Solution

Keep the photographic hero. Add three illustrative widgets to the existing process section: a lithium-carbonate industrial big bag in real 3D, a linked audit report, and a buyer Passport composition.

## User Stories

1. As a visitor, I want to see the packaged product alongside registration fields to understand what a Batch represents.
2. As a visitor, I want to see the report associated with the Batch to understand the auditor's contribution.
3. As a buyer, I want to see the evidence assembled in a Passport to understand review before purchase.
4. As a mobile visitor, I want all three widgets readable without horizontal scrolling.
5. As a visitor requesting reduced motion, I want complete static illustrations.
6. As a visitor without JavaScript or WebGL, I want the process content and packaged-product illustration to remain visible.

## Implementation Decisions

- Preserve current process headings and descriptions, theme isolation, hero, routes, and disclaimers.
- Use scoped CSS, native browser animation, and the existing Three.js dependency. No new package or map runtime.
- Lazy-load Three.js when the packaged-product widget approaches the viewport. Render a procedural rounded fabric bag with lifting loops and Li₂CO₃ label.
- Keep a server-rendered SVG bag illustration until successful WebGL rendering, including no-JavaScript and unavailable-WebGL cases.
- Use infinite explanatory animation loops, as explicitly requested by the user after the initial implementation: continuous 18-second product rotation, progressive 5.6-second report writing, and gentle 5.2-second buyer Passport movement. Pause offscreen or with a hidden document. Reduced motion and keyboard interaction restore complete static illustrations; pointer interaction resumes movement after keyboard use. Dispose graphics resources and animation loops on unmount.
- Use field categories, not fabricated Batch values or audit results. Mark the visual sequence as illustrative.
- Stack the widgets on narrow screens. Decorative compositions are hidden from assistive technology; existing semantic process text remains authoritative.
- The main Passport section displays a technical-document widget with all six existing field categories: origin/producer, quantity/chemical purity, water/carbon footprint, auditor report, integrity reference, and Batch state. Use a restrained masthead, Li₂CO₃ material formula, numbered rows, and explanatory text rather than nested cards, loading bars, or floating paper. A narrow decorative accent visits the six rows sequentially in a repeating 8.4-second reading cycle. Keep labels and explanations stationary, server-rendered and accessible, with the conceptual disclaimer visible. Reuse the process motion controller.

## Testing Decisions

Verify the real public page in Chromium at desktop and mobile widths, inspect rendered 3D, verify reduced-motion and no-JavaScript presentation, and check keyboard navigation and console errors. Run TypeScript and targeted lint after integration. No source-copy or incidental class-name permanent tests.

## Out of Scope

Live records, map integration, payment execution, certification claims, new authentication or purchase flows, fabricated metrics, and changes to the existing demo.

## Further Notes

The user explicitly authorized implementation after discovery. Technical implementation choices follow existing frontend constraints. This supersedes the prior exclusion of landing 3D only for the illustrative packaged-product widget.
