# Consenso propuesto — Validación del modelo de negocio JULIT

_Síntesis del coordinador tras 2 rondas de debate bull/bear sobre el plan de pivote (`.scratch/pivot-changes-extracted.txt`). Cada parte debe confirmar: AGREED / AGREED-WITH-CONDITIONS / DISAGREE._

## Veredicto conjunto propuesto

**Viable con condiciones.** El pivote resuelve un problema real con una primitiva técnicamente sólida y barata, pero el modelo de negocio tal como está especificado concentra su riesgo en la adopción y tiene tres defectos de diseño corregibles. Como demo de hackathon: fuerte. Como negocio: requiere los rediseños listados + evidencia de demanda real.

## Puntos acordados por ambas partes

1. **El problema es real y caro**: liquidar commodities cross-border vía LC/escrow cuesta 1–3% y días de exposición.
2. **La atomicidad técnica es real y barata**: `settle_lot` (USDC↔NFT en una tx) usa patrones canónicos; el programa es chico y el repo ya trae la infraestructura (PDA lifecycle, Codama, LiteSVM, índice RPC).
3. **Reserved-buyer-only es la decisión estructural correcta**: colapsa el requisito de liquidez de marketplace a cero.
4. **La aritmética por ticket es correcta**: margen bruto >95%; el cuello de botella es 100% demanda, no margen ni tecnología.
5. **La adopción es el riesgo #1**: cada par productor–comprador es una venta enterprise completa (custodia, multisig, fiat→USDC, sign-off legal) sin efecto de red entre pares. No hay evidencia de que pares reales paguen la prima por atomicidad.
6. **Defectos de diseño reconocidos por ambos**:
   - NFT libremente transferible durante el tránsito (título desacoplado del bien) → mitigar con Token-2022 non-transferable, transfer hook o freeze.
   - Sin `cancel_lot`/expiry → lotes brickeables en escrow.
   - Incentivo débil del `redeem` (burn post-pago sin recompensa) → mitigar devolviendo rent del escrow ATA al firmante.
   - Cert de planta autodeclarado no certifica pureza del lote → debilidad de diferenciación aceptada.
   - Superficie regulatoria real (título/warehouse receipt + take rate) → opinión legal por jurisdicción antes de mainnet; onboarding vía multisig/custodia (Squads) y pilotos chicos.
7. **`usdc_mint` como parámetro de Config** hace mainnet un cambio de configuración; treasury/admin debe ir bajo multisig.

## Propuesta de rediseño sobre la mesa (del bear, pendiente de confirmación bull)

Convertir `settle_lot` en escrow del USDC dentro del Lot PDA, liberado al producer por `redeem_lot`, más ventana de timeout/disputa. Efecto: el burn pasa de "recibo sin incentivo" a disparador del pago — el DvP deja de ser metáfora. Trade-off explícito: traslada el riesgo al producer (buyer hold-up), replicando la forma de una LC modernizada. Ambas partes deben pronunciarse sobre si este rediseño entra al consenso.

## Desacuerdos residuales (no bloquean el veredicto)

- **Nivel de confianza**: bull 60%, bear ~35% (sube a ~60–65% con el rediseño de escrow).
- **Historial público como moat**: bull lo considera switching cost acumulativo; bear objeta que un registro público es indexable por competidores y falsificable sin verificación por lote.

## Evidencia que validaría el modelo (lista conjunta)

- Piloto mainnet con un par productor–comprador real en USDC, aunque con lotes chicos.
- Opinión legal de exigibilidad del NFT+contrato en la jurisdicción objetivo.
- LOIs de buyers que hoy pagan LC/escrow por estos deals.
