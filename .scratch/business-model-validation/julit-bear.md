# JULIT Pivot — Caso BAJISTA (Bear Case)

## Tesis

El pivote convierte a JULIT en un escrow de NFTs con split de fees: una primitiva elegante pero trivialmente replicable, que resuelve el leg fácil (el pago) y declara fuera de scope los dos difíciles: verificar la entrega física y darle fuerza legal al título. Eliminar al auditor destruye la única pieza de confianza diferenciada del producto anterior; exigir comprador reservado elimina todo valor de descubrimiento; y el take rate monetiza volumen que todavía no existe. En devnet con dUSDC todo funciona; la distancia entre la demo y una liquidación real es, casi literalmente, todo el negocio.

## Candidatos a falla fatal (ordenados)

### 1. El ciclo de vida está roto por incentivos, no por código

`redeem_lot` es unilateral y post-pago: tras `settle_lot` el comprador ya tiene el NFT y la minera ya tiene el USDC. Quemar cuesta una firma y no le da nada al comprador. Resultado predecible: los lotes quedan en `Settled` para siempre y el "rastro permanente" depende de un paso sin incentivo. Peor: siendo un Metaplex NFT estándar en el ATA del comprador, nada impide transferirlo a un tercero mientras el cargamento viaja al comprador original — el "título digital" se desacopla del bien en el peor momento, y el burn puede firmarlo quien no recibió la mercadería. El plan no menciona freeze authority, transfer hook ni restricción alguna.

### 2. El gap oráculo/entrega es estructural

El documento lo admite: logística, aduana y recepción quedan "fuera del protocolo". El burn prueba que una wallet firmó, no que llegó litio. No hay disputa, árbitro, ventana de reclamo ni doble firma — y el único rol que podía arbitrar, el auditor, fue eliminado. El claim honesto del plan ("elimina riesgo de liquidación, no de contraparte") confirma que se resuelve el tercio fácil: el DvP protege contra "pagué y no me dieron el token", pero el riesgo real en commodities — "pagué y no llegó el cargamento" — sigue intacto.

### 3. Sin auditor y con cert de planta autodeclarado, el producto queda commoditizado

La certificación pasa a ser un PDF + SHA-256 subido por el propio producer, a nivel planta (no lote). La "verificación por hash" prueba solo que el PDF es el mismo que subió el vendedor — no que sea real, vigente, de laboratorio acreditado ni aplicable a este lote. Una planta certificada una vez mintea lotes ilimitados mientras la pureza deriva. La pregunta central del comprador — "¿ESTE lote es 99.5% battery grade?" — la responde el vendedor. Sin verificación por lote, JULIT es un escrow genérico: cualquiera forkea ~3 instrucciones de Anchor.

### 4. Regulatorio: el hedge del propio documento se come el value prop

Un token transferible que representa un derecho contractual sobre un lote físico, más un take rate sobre flujos de fondos, cae en territorio regulado (título/warehouse receipt/derivado según jurisdicción) e intermediación de pagos (VASP/MSB, KYC/AML). El plan se defiende diciendo que el NFT "no es título legal automático" — pero entonces el DvP no entrega título: entrega un recibo de un recibo y el contrato real sigue off-chain. Superficie regulatoria real, valor legal fino: la peor combinación.

### 5. No hay camino de salida

El set es `initialize`, `create_lot`, `settle_lot`, `redeem_lot` — sin cancel ni expiry. Si el comprador reservado no liquida, la minera se arrepiente, o hubo un typo en su wallet, lote y NFT quedan brickeados en escrow para siempre. Y si el precio vive solo off-chain, el "DvP atómico" liquida cualquier suma: el registro no prueba los términos, contradiciendo que el NFT representa el derecho contractual.

### 6. Adopción: el diseño excluye el caso donde duele el problema

Reserved-buyer-only implica que el deal ya se negoció entre partes que ya confían lo suficiente para contratar; para ese caso existen rieles con recurso legal (LC, escrow agent, wire, net-30). El dolor agudo del trade finance es con contrapartes NUEVAS — excluido por diseño. El comprador real (OEMs, cathode makers) no firma compras de litio desde un browser wallet: necesita multisig, ERP, custodia. dUSDC con airdrop esconde el costo de onboarding fiat→USDC→compliance; arriba quedan ciclos de venta de 12–24 meses y el huevo-gallina productor↔comprador.

### 7. Unit economics y competencia

Revenue = fee_bps × volumen, y el volumen depende de que deals pre-negociados paguen fee por algo que hoy resuelven con una wire de ~$30 o una LC que además incluye financiamiento, seguro e inspección. JULIT ofrece solo settlement — sin financiar, asegurar ni inspeccionar. Contra komgo, MineHub, Circulor (que sí cubre el EU battery passport con OEMs reales) y cualquier fork del programa, el diferencial se evaporó con el auditor. Contour, con backing bancario real, cerró en 2023: el trade finance on-chain mata hasta a los bien financiados.

## Qué evidencia cambiaría mi opinión

- Piloto firmado donde un par producer↔buyer real liquide lotes en mainnet USDC, aunque chicos.
- Opinión legal de que NFT+contrato es título exigible en la jurisdicción objetivo, más restricción de transferencia (freeze/hook) que acople título y bien.
- Mecanismo que ate el burn a evidencia de entrega (co-firma del carrier, oráculo logístico, confirmación dual).
- LOIs o datos de que buyers pagan hoy escrow/LC por estos deals y cambiarían de riel.
- Unit economics donde el take rate cubra onboarding + compliance a volúmenes realistas.
- Whitespace competitivo demostrado (p. ej., komgo/MineHub no atienden mineros SME de litio en LATAM).

## Cierre

El pivote es ejecutable y un buen demo de hackathon — pero como negocio cambia una propuesta débil pero diferenciada (auditoría por lote + passport) por una primitiva indiferenciada con ciclo de vida roto por incentivos, valor legal incierto e ingresos que asumen el volumen que el diseño desalienta.
