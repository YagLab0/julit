# 03: Process section — five-step lifecycle chain

**What to build:** the process section becomes a single connected five-step lifecycle chain — Descubrimiento, Tokenización, Liquidación, Entrega, Redención — with on-chain steps (Tokenización, Liquidación, Redención) visually distinguished from off-chain ones. The three existing process widgets are retired entirely: the big-bag 3D, the auditor-report animation, and the passport-review float. No WebGL loads on the page.

**Blocked by:** 01: Landing shell — navigation, hero, and metadata

**Status:** ready-for-agent

- [ ] The chain reads as one connected sequence of five steps in order, each with the approved copy
- [ ] On-chain and off-chain steps are visually distinguishable and labelled so the protocol boundary is clear
- [ ] Plain-Spanish-first language: "título digital", "custodia del protocolo", "liquidación"; technical terms appear in step detail, not headlines
- [ ] The chain stacks or scrolls naturally on narrow viewports without horizontal overflow
- [ ] The retired widgets and their dead modules/assets are removed; no Three.js or WebGL code loads on the landing
- [ ] Any retained motion reuses the existing controller (visibility pausing, reduced-motion, keyboard cancellation, cleanup)
- [ ] Semantic structure: one section, coherent heading, step order preserved without CSS
