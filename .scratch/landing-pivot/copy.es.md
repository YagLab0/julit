# Copy de la landing pivote de JuLit

Estado: borrador — pendiente de aprobación del usuario. Los rótulos de sección organizan este documento; no todos deben mostrarse en la interfaz.

## Navegación

- Marca: **JuLit**
- Enlaces: **Solución** · **Cómo funciona** · **Pasaporte** · **Preguntas frecuentes** · **Equipo**
- Acceso: **Ingresar** → `/sign-in`
- Acción principal: **Explorar demo** → `/explorer`

## 1. Hero

**Antetítulo**
Litio de Jujuy. Proyección global.

**Título**
Del salar al mercado, con liquidación atómica.

**Descripción**
JuLit conecta productores y compradores de carbonato de litio. Cada lote nace con un título digital, y el pago se liquida en la misma transacción en que el título cambia de manos, sobre Solana.

**Acciones**
Explorar demo · Cómo funciona

**Nota de alcance**
La demo corre en Solana Devnet con tokens de prueba: las transacciones son reales, el valor no.

## 2. Problemas y soluciones

**Antetítulo**
La propuesta JuLit

**Título**
El pago y el lote, en la misma transacción.

**Introducción**
En el comercio B2B de litio, pagar antes de recibir o entregar antes de cobrar deja a una de las partes expuesta. JuLit propone cerrar esa brecha alrededor de un título digital por lote.

### Liquidación sin ventana de riesgo

**Problema:** en una operación común, el pago y la entrega del bien no ocurren al mismo tiempo; alguien asume el riesgo de que la otra parte no cumpla.
**Solución:** la liquidación es una sola transacción — el pago del comprador y el título digital del lote cambian de manos juntos, o no cambia nada.

### Un solo registro para todos

**Problema:** cada parte guarda sus propios datos del lote — origen, cantidad, pureza, estado — y reconciliarlos cuesta tiempo y genera disputas.
**Solución:** el título digital concentra la referencia del lote y su historial es consultable públicamente en el Pasaporte.

### Evidencia a nivel planta

**Problema:** auditar cada lote por separado no refleja cómo certifica la industria real y multiplica fricción documental.
**Solución:** el productor declara el certificado de su planta una sola vez; cada lote registra su referencia y cualquiera puede comprobar que el documento coincide con la versión registrada.

### Operaciones reservadas, no góndola abierta

**Problema:** los acuerdos entre mineras y compradores se negocian en privado, pero los datos comerciales terminan dispersos o públicos.
**Solución:** todo lote nace reservado a un comprador designado; el acuerdo se cierra entre las empresas y solo el comprador designado puede liquidarlo.

## 3. Cómo funciona

**Antetítulo**
El ciclo de vida de un lote

**Título**
Cinco pasos, tres de ellos en la cadena.

### Paso 1 — Descubrimiento

Directorio B2B: origen, capacidad y certificación de planta. El acuerdo comercial se negocia en privado entre las empresas.

### Paso 2 — Tokenización

El productor registra el lote ya reservado a su comprador: nace el título digital (un NFT), que queda en custodia del protocolo.

### Paso 3 — Liquidación

El comprador designado ejecuta la liquidación: su pago en USDC llega al productor y el título digital llega al comprador, en la misma transacción.

### Paso 4 — Entrega

La logística, la aduana y la recepción del cargamento ocurren fuera del protocolo.

### Paso 5 — Redención

El comprador confirma la recepción: el título se quema y el lote queda marcado como redimido, con un rastro permanente y verificable.

**Nota**
Los pasos de tokenización, liquidación y redención ocurren en la cadena; el descubrimiento y la entrega física quedan fuera del protocolo.

## 4. Pasaporte

**Antetítulo**
El Pasaporte del lote

**Título**
El historial de cada lote, en un solo lugar.

**Introducción**
El Pasaporte es la vista pública del ciclo de vida del lote: su título, sus transacciones y su certificado de planta, verificables por cualquiera.

**Composición conceptual (seis filas)**

1. Lote · origen · productor
2. Cantidad · pureza química · precio
3. Certificado de planta · referencia de integridad
4. Título digital · custodia
5. Estado del ciclo · listado → liquidado → redimido
6. Transacciones · registro · liquidación · redención

**Aclaración**
Vista conceptual: representa la estructura de un Pasaporte, no un lote real ni resultados verificados.

## 5. Beneficios por participante

**Antetítulo**
Para cada lado de la operación

### Productor

**Título:** Cobrás cuando entregás el título.

- El pago del comprador llega en la misma transacción que transfiere el título digital.
- Declarás el certificado de planta una sola vez y cada lote lo referencia.
- El historial del lote queda verificable por cualquiera.

### Comprador

**Título:** Pagás solo si recibís el título.

- El pago y el título digital cambian de manos en la misma transacción: no hay ventana de riesgo.
- Verificás el certificado de planta y el historial del lote antes y después de liquidar.
- Confirmás la recepción con la redención, que cierra el ciclo con evidencia permanente.

## 6. Preguntas frecuentes

### ¿Los tokens y la liquidación tienen valor real?

No. La demo corre en Solana Devnet con dUSDC, un token de prueba creado por el proyecto. Las transacciones son reales — se ejecutan y quedan registradas en la cadena — pero los tokens no tienen valor comercial.

### ¿Qué es el título digital del lote?

Un NFT que representa el derecho contractual sobre el lote. Vive en custodia del protocolo desde el registro hasta la liquidación, y se quema cuando el comprador confirma la recepción. Es una representación digital de ese derecho, no un título legal automático.

### ¿Qué verifica el certificado de planta?

Que el documento coincide con la versión registrada: se compara el resumen SHA-256 del PDF con la referencia declarada en el lote. Prueba la integridad del documento, no la verdad de su contenido.

### ¿La entrega física pasa por JuLit?

No. El transporte y la recepción del cargamento ocurren fuera del protocolo. La redención es la confirmación on-chain de que la entrega se concretó, no el mecanismo de entrega.

### ¿Puedo comprar cualquier lote listado?

No. Todo lote nace reservado a un comprador designado: el acuerdo comercial se negocia entre las empresas y solo el comprador designado puede ejecutar la liquidación. No hay compra abierta.

### ¿Quiénes aparecen en el demo?

Empresas, orígenes y lotes ficticios creados para la demostración. No representan operaciones ni compañías reales.

## 7. Equipo

Sin cambios respecto al copy vigente.

## 8. Cierre

**Antetítulo**
Litio de Jujuy. Proyección global.

**Título**
Del salar al mercado, con liquidación atómica.

**Descripción**
Un directorio B2B y un protocolo de entrega contra pago para el carbonato de litio, construido sobre Solana.

**Acción**
Explorar demo

## Metadatos

- Título: `JuLit | Del salar al mercado, con liquidación atómica`
- Descripción: `Conocé JuLit: directorio B2B y liquidación atómica de lotes de carbonato de litio sobre Solana. Desde Jujuy hacia la cadena global del litio.`
