# Consenso — Posición BEAR (ronda final)

## 1. POSITION

**AGREED-WITH-CONDITIONS.** Acepto el veredicto "viable con condiciones" y los 7 puntos acordados: son una síntesis fiel y el draft reconoce los defectos de diseño correctos. Convergencias que adopto de la réplica bull: (a) el gap oráculo/entrega es alcance deliberado, no defecto —ningún riel de settlement verifica carga física; (b) un lote atascado en `Settled` no deja fondos retenidos —el daño es de completitud del registro, no económico; (c) es razonable asumir `price` almacenado en el Lot PDA (patrón de `price_usdc_scaled` ya vigente en `Batch`), y la transferencia on-chain registra el monto ejecutado igualmente. Condiciono la firma a las enmiendas de la sección 3.

## 2. Ruling: el rediseño de escrow — mandatorio u opcional

**Mandatorio para cualquier deployment con dinero real; opcional solo para el demo de hackathon.** Tres razones: (a) es el único fix que cierra el ciclo con incentivo económico real —la mitigación alternativa del draft (devolver rent del ATA, ~0.002 SOL) es cosmética en tickets de seis cifras; (b) corrige el defecto de secuencia que quedó sin réplica en R2: hoy `settle_lot` cobra al comprador **antes** del embarque, exposición peor que una LC, que solo paga contra documentos de embarque conformes; (c) es lo que convierte "DvP" de metáfora en mecánica —sin escrow, el protocolo es "atomic swap + recibo", valor fino que no sostiene un take rate. Concedo el trade-off: traslada el hold-up al productor y exige timeout/disputa —pero esa es exactamente la forma de la LC que el modelo dice reemplazar.

## 3. Enmiendas requeridas (máx 3)

1. **§6 — agregar el defecto de secuencia** ("settle cobra pre-embarque: exposición del comprador peor que bajo LC") y elevar el rediseño de escrow de "propuesta pendiente" a **condición requerida antes de mainnet**, con nota del trade-off producer-hold-up + timeout/disputa.
2. **§6, bullet de incentivo del redeem**: precisar que la devolución de rent es un incentivo nominal, no material —registrar que el cierre del ciclo queda garantizado solo por escrowed settlement o por obligación contractual off-chain.
3. **Decisión explícita de semántica del NFT**: la mitigación non-transferable del draft ya elige "recibo restringido", pero la réplica bull invocó la transferibilidad como "mercado secundario de la reclamación" (warehouse receipt negociable). Son incompatibles: el consenso debe fijar una —la opción negociable incrementa la exposición a instrumento regulado y contradice el hedge "no es título legal"; la restringida la reduce.

## 4. Confianza final

**~55%** asumiendo el consenso adoptado con el rediseño de escrow como condición requerida y las mitigaciones de §6 (sube desde ~35% as-pitched). El riesgo residual dominante es empírico, no argumental: sigue sin existir evidencia de que pares productor–comprador reales paguen la prima por liquidación atómica —solo el piloto mainnet de la lista de evidencia conjunta puede resolver eso.
