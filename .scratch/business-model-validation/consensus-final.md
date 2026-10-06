# Consenso final — Validación del modelo de negocio JULIT

_Resultado del debate bull/bear orquestado (2 workers Devin, 3 rondas) sobre el plan de pivote. Ambas partes firmaron **AGREED-WITH-CONDITIONS**; este documento incorpora las enmiendas exigidas por ambos, que resultaron convergentes._

## Veredicto

**Viable con condiciones.** El pivote resuelve un problema real con una primitiva técnicamente sólida y barata, pero el modelo tal como está especificado concentra su riesgo en la adopción y requiere un rediseño del settlement antes de tocar dinero real.

- Confianza final: **bull 65% / bear ~55%** (con el consenso adoptado).
- Como demo de hackathon: fuerte. Como negocio: requiere los rediseños + evidencia de demanda.

## Acuerdo central: settlement con escrow (condición requerida para mainnet)

`settle_lot` deja de pagar directo al producer: **custodia el USDC en el Lot PDA y `redeem_lot` lo libera al producer cuando el comprador firma recepción**. Además:

- **Timeout**: reclamo unilateral del producer tras T si el comprador no firma ni disputa.
- **Disputa**: flag solo pre-timeout que congela fondos; resolución off-chain por el contrato comercial subyacente (sin árbitro on-chain en v1).
- **Trade-off aceptado por ambos**: el riesgo pasa del comprador al producer (buyer hold-up) — la misma forma que una LC modernizada, que es lo que el modelo dice reemplazar.
- Efecto: el burn pasa de "recibo sin incentivo" a **disparador del pago**; el DvP deja de ser metáfora y se vuelve mecánica.

## NFT del lote: recibo restringido (decisión fijada)

Bajo el diseño con escrow, quien porta el NFT controla la liberación del pago → la transferibilidad libre es incompatible. **Non-transferable (Token-2022) o freeze del escrow→buyer es requisito, no opción.** Se descarta la lectura de "warehouse receipt negociable": aumenta superficie regulatoria y contradice el claim "no es título legal".

## Otros puntos acordados

1. Problema real y caro (LCs 1–3%, días de exposición); la atomicidad técnica es real y barata sobre infraestructura ya construida.
2. Reserved-buyer-only es la decisión estructural correcta: colapsa el requisito de liquidez a cero.
3. La aritmética por ticket es correcta (margen >95%); **el cuello de botella es 100% demanda, no margen ni tecnología**.
4. **La adopción es el riesgo #1**: cada par productor–comprador es una venta enterprise completa (custodia, multisig, fiat→USDC, sign-off legal) sin efecto de red entre pares.
5. `cancel_lot`/expiry sigue siendo necesario (lotes brickeables si el buyer nunca liquida).
6. La devolución de rent del ATA es incentivo nominal, no material — el cierre del ciclo lo garantiza el escrowed settlement o la obligación contractual off-chain.
7. El gap oráculo/entrega es alcance deliberado, no defecto: ningún riel de settlement verifica carga física (concesión del bear).
8. Un lote atascado en `Settled` no deja fondos retenidos: el daño es de completitud del registro, no económico (concesión del bear).
9. Cert de planta autodeclarado no certifica pureza del lote → debilidad de diferenciación aceptada.
10. `usdc_mint` como parámetro hace mainnet un cambio de config; treasury/admin bajo multisig.
11. Opinión legal de exigibilidad del NFT+contrato por jurisdicción antes de mainnet.

## Desacuerdos residuales (registrados, no bloquean)

- **Historial público como moat**: bull lo defiende como switching cost acumulativo; bear objeta que un registro público es indexable por competidores y falsificable sin verificación por lote.

## Evidencia que validaría el modelo (lista conjunta)

- Piloto mainnet con un par productor–comprador real en USDC, lotes chicos.
- Opinión legal de exigibilidad del NFT+contrato en la jurisdicción objetivo.
- LOIs de buyers que hoy pagan LC/escrow por estos deals.
- Whitespace competitivo demostrado (p. ej., komgo/MineHub no atienden mineros SME de litio en LATAM).

## Artefactos del debate

- `julit-bull.md`, `julit-bear.md` — posiciones ronda 1
- `julit-bear-r2-response.md` (réplica bull), `julit-bull-r2-response.md` (réplica bear) — ronda 2
- `julit-consensus-draft.md` — draft del coordinador
- `julit-consensus-bull.md`, `julit-consensus-bear.md` — posiciones finales firmadas
