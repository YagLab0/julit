# 06: End-to-end verification

**What to build:** the complete landing is verified through the single approved seam — the real public page `/` in the running application — and dead code from the old model is removed.

**Blocked by:** 02: Problem/solution section; 03: Process section — five-step lifecycle chain; 04: Passport section — redefined composition; 05: Participant benefits, FAQ, and closing copy

**Status:** ready-for-agent

- [ ] All eight sections render server-rendered for an anonymous visitor, in order, without wallet prompts
- [ ] Section anchors navigate to Solución, Cómo funciona, Pasaporte, Preguntas frecuentes, and Equipo; CTAs and Ingresar resolve to their targets
- [ ] FAQ disclosures open/close by pointer and keyboard without delayed motion
- [ ] Desktop, mobile, and narrow viewports show the same content with no horizontal scrolling or clipped actions
- [ ] The landing stays light regardless of app/OS theme; the close stays dark; a visit and return preserves the previously selected app theme
- [ ] Reduced motion removes positional/scale animation while content remains available; entrances happen at most once
- [ ] Spanish metadata, favicon, and footer photograph attribution are correct
- [ ] No WebGL/Three.js, no auditor or simulated-settlement artifacts, and no orphaned modules or styles remain from the old landing
- [ ] Build and lint pass as mechanical checks
