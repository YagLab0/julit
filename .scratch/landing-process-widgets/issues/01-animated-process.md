# 01: Illustrate the complete Batch process

**What to build:** Add three animated illustrative widgets to the landing process: an industrial lithium-carbonate big bag in 3D for registration, an auditor report linked to the Batch, and a buyer Passport gathering evidence. Preserve the existing photographic hero and application flows.

**Blocked by:** None (can start immediately).

**Status:** completed

- [x] All three existing process stages have distinct illustrative widgets with Spanish labels.
- [x] The first widget displays a real 3D big bag with lifting loops and Li₂CO₃ marking.
- [x] Animation loops indefinitely while visible, pauses offscreen, and is disabled for reduced motion.
- [x] Static illustrations and process text remain usable without JavaScript or WebGL.
- [x] Desktop and mobile compositions have no clipping or horizontal overflow.
- [x] No fabricated records, certification results, or executed-payment claims are added.
- [x] Browser smoke verification, TypeScript, and targeted lint complete.

Verification: Chromium at 1440px, 390px, and 320px; actual rendered canvas; reduced motion at load and during active animation; keyboard cancellation (19 animations to zero); no-JavaScript page; restored SVG on forced WebGL context loss. TypeScript and targeted ESLint passed. Narrow-screen inspection exposed a cleared offscreen canvas after resize; rendering the still frame on resize corrected it.

Continuous-animation revision: the user requested infinite product rotation, report writing, and buyer movement, and explicitly excluded browser checks for this revision. A non-browser runtime harness exercised the actual component effects with controlled frame scheduling and stubbed rendering/animation APIs: rotation beyond a full revolution, offscreen pause/resume without time jumps, hidden-document pause, live reduced-motion cancellation/resume, keyboard/pointer switching, and resource cleanup. No visual/browser verification was performed for this revision.

Main Passport enhancement: replaced the plain conceptual field grid with a branded animated document widget and six field cards. Decorative writing tracks loop alongside gentle document movement, using the shared visibility/reduced-motion controller. Non-browser smoke rendered the actual server component and exercised six writing loops plus document movement, including reduced-motion cancellation and cleanup. All six requested labels and the conceptual disclaimer remain present and accessible. No browser checks were performed for this enhancement.

Design revision after user rejection of the generic card treatment: replaced nested field cards, icons, animated progress tracks, floating paper, and dark header with a restrained technical document, numbered rows, and field explanations. A narrow accent cycles through rows without obscuring or moving content. Non-browser smoke rendered the real section and exercised the six-row focus cycle, confirming sequential non-overlapping highlights, viewport pausing, and reduced-motion cancellation. No browser checks were performed.
