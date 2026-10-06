# 01: Landing shell — navigation, hero, and metadata

**What to build:** the landing opens with the pivot identity: the new settlement-forward headline and description, the Devnet scope note, the **Explorar demo** action pointing at the explorer surface, **Ingresar** to sign-in, working section anchors for all eight sections, and updated Spanish page metadata. Everything below the hero may still show the old sections — they are replaced by later tickets.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Hero shows the approved headline "Del salar al mercado, con liquidación atómica", the new description, and both actions
- [ ] The scope note states the demo runs on Solana Devnet with test tokens: transactions are real, value is not
- [ ] The primary action targets the explorer surface (`/explorer`); if the final route differs at implementation time, the link follows it
- [ ] Navigation exposes the section links (Solución, Cómo funciona, Pasaporte, Preguntas frecuentes, Equipo) plus Ingresar on desktop, and keeps identity + demo action + reachable login on narrow screens
- [ ] Section anchors resolve for all eight sections in document order
- [ ] Page title and description metadata match the approved copy; favicon and brand artwork unchanged
- [ ] No auditor, audit-certificate, or simulated-settlement language remains in navigation or hero
- [ ] Server-rendered content, no new client behavior, no heavy demo prefetch
