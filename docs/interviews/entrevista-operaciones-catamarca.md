# Guía de Entrevista: Operaciones Mineras y Logística (Catamarca)

> **Proyecto:** JuLit (Prototipo experimental para Hackathon)  
> **Perfil objetivo:** Ingeniero de operaciones, jefe de planta, logística de salar o control de calidad en Catamarca (ej. Salar del Hombre Muerto, Fiambalé, Antofagasta de la Sierra).  
> **Duración estimada:** 15–20 minutos.  
> **Objetivo:** Validar cómo se despacha físicamente el carbonato de litio, cómo se gestionan los certificados de calidad/sustentabilidad y qué fricciones reales existen antes de liberar la carga.

---

## 1. Mensaje de contacto inicial (WhatsApp / LinkedIn / Email)

*Copia, edita y envía este mensaje:*

```text
Hola ¿cómo está?. Le escribo porque hablando con Fernando Baca nos recomendó con usted debido a su experiencia en el día a día operativo de la minería y me vendría genial su mirada técnica.

Estoy participando en una competencia técnica / hackathon internacional donde desarrollamos un prototipo experimental llamado JuLit, enfocado en reducir trabas y fricciones en el despacho y trazabilidad de lotes de carbonato de litio.

Para no armar una solución teórica desconectada de la realidad, queríamos validar unas cuantas preguntas operativas con alguien que conozca el terreno de primera mano, obviamente con respuestas que pueda brindarnos a nivel general y de estándar de la industria, sin comprometer ninguna información confidencial de su operación (certificados de calidad, tiempos de despacho y trazabilidad ambiental).

A continuacion le dejo un formulario donde podra ver y responder las dudas que tenemos:

https://docs.google.com/forms/d/e/1FAIpQLSekSYvQmB8YUQCZo9uuvgyuWnFtoLYzDAR5yQpIkTDQvXcyRw/viewform
```

---

## 2. Introducción rápida (1 minuto al inicio de la llamada)

> *"El proyecto es JuLit, un prototipo experimental para una competencia. Lo que modela es un escrow digital donde el comprador internacional deposita los fondos por adelantado antes de que el camión salga del salar, y el cobro se liquida en el instante en que valida la carga en destino. Además, busca vincular el certificado de laboratorio (pureza ≥99.5%) y métricas de agua/carbono directamente al lote para cumplir con el pasaporte digital que exigirá Europa en 2027. Queremos entender la realidad operativa en Catamarca para ver si nuestros supuestos hacen sentido o si la faena funciona de otra forma."*

---

## 3. Batería de preguntas editables

### Bloque A: Despacho y Logística desde el Salar

#### A1. ¿Cómo es el paso a paso desde que un lote de carbonato de litio está listo en big bags hasta que sale el transporte?
* **Por qué preguntamos:** Queremos saber en qué momento exacto se considera "comprometida" la carga y qué documentación viaja físicamente vs digitalmente (remitos, guías mineras, precintos).
* **Notas / Edición:**
  > [Escribe aquí las respuestas o edita la pregunta]

#### A2. ¿Ocurre alguna vez que un cargamento se demore en salir de faena por cuestiones administrativas, bancarias o de confirmación de pago?
* **Por qué preguntamos:** Validar si la desconfianza de pago ("no embarco hasta que esté asegurado el cobro") frena camiones o si es un proceso 100% aceitado.
* **Notas / Edición:**
  > [Escribe aquí las respuestas o edita la pregunta]

---

### Bloque B: Control de Calidad e Inspección (El "Oracle Problem")

#### B1. ¿Cómo y cuándo se certifica la calidad del lote (pureza ≥99.5%, humedad, impurezas)? ¿Se usa laboratorio propio de planta o peritos independientes (SGS, Alex Stewart)?
* **Por qué preguntamos:** En el protocolo, el certificado químico se asocia de forma inmutable al lote. Necesitamos saber qué entidad emite la verdad del ensayo.
* **Notas / Edición:**
  > [Escribe aquí las respuestas o edita la pregunta]

#### B2. ¿Qué pasa si la carga llega a puerto o a destino internacional y el comprador alega que la calidad no cumple la especificación? ¿Cómo se resuelven esas disputas hoy?
* **Por qué preguntamos:** El smart contract tiene un estado de `raise_dispute` que congela los fondos. Queremos saber si en la práctica esto se resuelve con contra-muestras lacradas o vía contratos comerciales.
* **Notas / Edición:**
  > [Escribe aquí las respuestas o edita la pregunta]

---

### Bloque C: Trazabilidad Ambiental y Regulatoria (Battery Passport)

#### C1. ¿Están midiendo o les están empezando a exigir métricas específicas de consumo de agua (salmuera/agua dulce) y huella de carbono por tonelada producida?
* **Por qué preguntamos:** A partir de febrero de 2027, la Unión Europea exige por ley el "EU Battery Passport" con métricas auditadas por lote. Queremos saber si ya es una preocupación en Catamarca.
* **Notas / Edición:**
  > [Escribe aquí las respuestas o edita la pregunta]

#### C2. ¿Cómo viajan esos certificados y reportes hoy en día? (¿Son PDFs enviados por correo electrónico o usan algún sistema integrado?)
* **Por qué preguntamos:** JuLit plantea que anclar el hash criptográfico del certificado reemplaza el intercambio informal de PDFs vulnerables a manipulaciones.
* **Notas / Edición:**
  > [Escribe aquí las respuestas o edita la pregunta]

---

### Bloque D: Estructura Comercial (Majors vs Nuevos Proyectos)

#### D1. En tu experiencia en la región, ¿todo el volumen se vende a socios corporativos directos (offtake a largo plazo), o existe venta spot / lotes de prueba a nuevos clientes?
* **Por qué preguntamos:** Los proyectos maduros (Fénix, Tres Quebradas) venden a sus propios socios; nuestro nicho son los proyectos nuevos en construcción/exploración que venden lotes de calificación a terceros.
* **Notas / Edición:**
  > [Escribe aquí las respuestas o edita la pregunta]

#### D2. Para un proyecto nuevo que está arrancando en la Puna, ¿cuál es el mayor dolor de cabeza operativo para coordinar con un comprador internacional desconocido?
* **Por qué preguntamos:** Descubrir dolores no contemplados en el diseño del protocolo.
* **Notas / Edición:**
  > [Escribe aquí las respuestas o edita la pregunta]

---

## 4. Cierre y agradecimiento

* *"¿Hay algún detalle operativo clave sobre el despacho en salares que sientas que la gente de tecnología o finanzas suele pasar por alto?"*
* *"¿Conoces a algún colega de logística o de laboratorio a quien le pueda interesar mirar este esquema?"*
