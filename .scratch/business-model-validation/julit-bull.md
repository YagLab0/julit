# Caso Bull — JULIT: directorio industrial B2B + liquidación DvP atómica

## Tesis

JULIT convierte el momento más riesgoso del comercio bilateral de commodities —el intercambio de pago por título— en una sola transacción atómica con costo marginal casi nulo, monetizada con un take rate, sobre una capa de directorio y contratos que ya existe. El pivote reemplaza el "settlement simulado" actual (ADR-0002) por liquidación real en USDC y elimina el auditor, el eslabón más débil del modelo anterior: un tercero confiable por lote que no escalaba y agregaba fricción sin atacar el riesgo que más duele, el de liquidación.

## Fortalezas principales

### 1. Problema real, caro y fácil de explicar

La liquidación de commodities transfronterizos (litio del triángulo andino hacia Asia) hoy depende de cartas de crédito, agentes de escrow y procesamiento documental manual: días de exposición, costos de 1–3% del valor, y riesgo de principal si alguna pata falla. DvP atómico elimina ese riesgo de forma binaria: o se ejecutan ambas patas (USDC comprador→productor, NFT escrow→comprador) o ninguna. Es el mismo principio que rige la liquidación de valores en TradFi, aplicado donde no existe —una narrativa que cualquier jurado o CFO entiende en una frase.

### 2. El diseño esquiva el problema de arranque en frío

"Solo lotes con comprador reservado" es la decisión estructural más fuerte del plan. No se necesita liquidez de marketplace ni un libro de órdenes: cada deal llega con sus dos partes ya negociadas. Un solo par productor–comprador es un caso de uso completo y pagador. La plataforma embarca relaciones comerciales existentes en lugar de pretender crearlas, lo que colapsa el requisito de masa crítica a casi cero.

### 3. Economía unitaria del take rate: sana y defensible

Los lotes industriales son tickets altos: 20–50 t de carbonato de litio a precios de mercado implican ~US$200k–600k por liquidación. El costo marginal de cada settle es gas (~fracciones de centavo) más rent de cuentas —margen bruto >95% sobre cualquier fee. Con un take rate de apenas 25–50 bps, cada lote deja US$500–3.000 a treasury, contra US$2.000–18.000 que cuesta una LC sobre el mismo volumen: una orden de magnitud más barato que el incumbente. La pregunta honesta —¿por qué pagar un fee si un transfer USDC directo es gratis?— tiene respuesta estructural: un transfer simple no puede ser atómico con la transferencia del título, ni genera un recibo verificable permanente. El fee compra atomicidad + prueba pública; eso no se puede auto-proveer.

### 4. Viabilidad técnica: patrón canónico sobre base ya construida

El programa es deliberadamente pequeño: `initialize`, `create_lot`, `settle_lot`, `redeem_lot`. PDA como update authority del NFT, escrow ATA firmado por PDA, CPI a Metaplex Token Metadata, split de fee en una sola transacción —todos patrones estándar (los marketplaces de NFTs resuelven exactamente este DvP). Los riesgos reales ya están nombrados en el plan y tienen mitigación: pinning de `mpl-token-metadata` contra anchor 0.32.1 (resolver primero), tamaño de `create_lot` (fallback: instrucción partida o LUT/tx v1), dependencia del seed para dUSDC. Crítico: el repo ya contiene toda la infraestructura de soporte —ciclo de vida PDA, cliente Codama generado, tests LiteSVM, índice Supabase verificado por RPC, wallet-link challenges, contratos entre empresas. El pivote reescribe la máquina de estados, no el stack.

### 5. Defensibilidad por historial acumulado, no por código

El contrato es conmutable; el registro acumulado no. Cada lote settled→redeemed construye un historial on-chain verificable de entregas cumplidas por empresa —reputación portable que ningún competidor puede copiar— más una base off-chain de contrapartes vetadas (wallets verificadas, contratos mutuo-consentimiento, certificados de planta hasheados). Directorio + settlement + recibo permanente = switching costs que crecen con cada deal.

### 6. Disciplina de claims que sobrevive escrutinio

"Elimina el riesgo de liquidación, no el de contraparte"; "el NFT representa un derecho contractual, no es título legal automático". Este encuadre honesto es una ventaja competitiva: resiste el escrutinio de jurados, reguladores y compradores enterprise, donde los proyectos RWA que sobre-prometen ("título legal on-chain") pierden credibilidad instantáneamente.

## Evaluación de unit economics

Revenue = `fee_bps × volumen liquidado`. Costos: gas despreciable, rent ~0.01–0.04 SOL por lote (parcialmente recuperable), más costos fijos de onboarding. Con tickets de seis cifras, incluso 10 bps generan ingreso material por transacción; el límite real no es el margen sino el volumen de deals embarcados. El modelo es bajo-burn y escala con GMV, no con headcount.

## Condiciones necesarias para el éxito

1. **Al menos un par productor–comprador real dispuesto a liquidar vía el protocolo.** El modelo no genera demanda, la embarca; sin counterparties existentes no hay take rate.
2. **`fee_bps` muy por debajo del costo incumbente (LC/escrow ~100–300 bps)** y comunicado explícitamente como prima por atomicidad, no como peaje.
3. **El eslabón off-chain de entrega física no rompe incentivos:** el comprador ya pagó en settle y el burn es su recibo —funciona si el registro público le aporta valor reputacional o si el contrato subyacente lo exige. El vendedor nunca queda expuesto.
4. **El encuadre legal se mantiene:** NFT como evidencia de derecho contractual existente (wrapper legal por jurisdicción) y aceptación de certificación de planta autodeclarada —coherente porque el comprador reservado ya vetó al productor off-chain.
5. **Ejecución técnica dentro del plan:** resolver el pinning Metaplex/anchor y el tamaño de `create_lot`, y para mainnet intercambiar dUSDC por USDC real (`usdc_mint` ya es parámetro de Config) con gobernanza de treasury/admin bajo multisig.
