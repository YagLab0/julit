import { ProcessWidgetMotion } from "./process-widget-motion";
import styles from "./passport-faq.module.css";

export function PassportSection() {
  return (
    <section
      id="pasaporte"
      aria-labelledby="passport-heading"
      className="bg-background text-foreground"
    >
      <div className={styles.container}>
        <div className={styles.passportLayout}>
          <div className={styles.passportCopy} data-landing-reveal>
            <p className="eyebrow">El Pasaporte del lote</p>
            <h2 id="passport-heading" className={styles.heading}>
              El historial de cada lote, en un solo lugar.
            </h2>
            <p className={styles.description}>
              El Pasaporte es la vista pública de todo el recorrido del lote:
              su título, sus operaciones y su certificado de planta,
              verificables por cualquiera.
            </p>
            <p className={styles.integrityNote}>
              El título digital representa un derecho contractual sobre el lote;
              no es un título legal automático. Comprobar el certificado prueba
              que el documento coincide con la versión registrada, no la verdad
              de su contenido.
            </p>
          </div>

          <figure
            className={styles.passportFigure}
            data-landing-reveal
            data-landing-delay="50"
          >
            <ProcessWidgetMotion className={styles.widgetFrame}>
              <div className={styles.document}>
                <div className={styles.documentMasthead}>
                  <span className={styles.widgetBrand}>JuLit</span>
                  <span className={styles.documentEdition}>
                    Registro del lote
                  </span>
                </div>
                <div className={styles.documentHeader}>
                  <p className={styles.documentTitle}>
                    Pasaporte
                    <br />
                    del lote
                  </p>
                  <span className={styles.documentMaterial}>Li₂CO₃</span>
                </div>
                <ol className={styles.fields}>
                  {[
                    {
                      title: "Lote, origen y productor",
                      description:
                        "Identidad del lote, procedencia del material y productor declarante.",
                    },
                    {
                      title: "Cantidad, pureza y precio",
                      description:
                        "Volumen declarado, composición del carbonato y condiciones del lote.",
                    },
                    {
                      title: "Certificado de planta",
                      description:
                        "Documento de la planta y su referencia de integridad registrada.",
                    },
                    {
                      title: "Título digital",
                      description:
                        "El título único del lote y la custodia que lo resguarda hasta la liquidación.",
                    },
                    {
                      title: "Estado del lote",
                      description:
                        "Listado, con depósito o liquidado: dónde está el lote en su recorrido.",
                    },
                    {
                      title: "Operaciones",
                      description:
                        "Registro, depósito y liquidación, cada una con su comprobante público.",
                    },
                  ].map((field, index) => (
                    <li key={field.title} className={styles.field}>
                      <span
                        className={styles.fieldAccent}
                        data-process-focus
                        aria-hidden="true"
                      />
                      <span className={styles.fieldNumber} aria-hidden="true">
                        0{index + 1}
                      </span>
                      <div className={styles.fieldContent}>
                        <span className={styles.fieldTitle}>{field.title}</span>
                        <span className={styles.fieldDescription}>
                          {field.description}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className={styles.documentFooter}>
                  <span>Carbonato de litio</span>
                  <span>Vista conceptual</span>
                </div>
              </div>
            </ProcessWidgetMotion>
            <figcaption className={styles.conceptCaption}>
              Vista conceptual del pasaporte. No representa un lote real ni
              resultados verificados.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section
      id="preguntas-frecuentes"
      aria-labelledby="faq-heading"
      className="bg-background text-foreground"
    >
      <div className={`${styles.container} ${styles.faqLayout}`}>
        <div className={styles.faqIntro} data-landing-reveal>
          <h2 id="faq-heading" className={styles.heading}>
            Lo importante, sin letra chica.
          </h2>
        </div>

        <div
          className={styles.questions}
          data-landing-reveal
          data-landing-delay="50"
        >
          <details className={styles.question}>
            <summary>
              <span>¿La demo mueve dinero real?</span>
              <span className={styles.disclosureMarker} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>
              No. La demo funciona en un entorno de prueba con un token
              ficticio creado por el proyecto. Las operaciones se ejecutan y
              quedan registradas de verdad, pero el dinero no tiene valor
              comercial.
            </p>
          </details>

          <details className={styles.question}>
            <summary>
              <span>¿Qué es el título digital del lote?</span>
              <span className={styles.disclosureMarker} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>
              Un certificado digital único que representa el derecho
              contractual sobre el lote. Queda resguardado por JuLit y se da de
              baja cuando el comprador confirma la recepción: nunca cambia de
              manos. Es la representación digital de ese derecho, no un título
              legal automático.
            </p>
          </details>

          <details className={styles.question}>
            <summary>
              <span>¿Qué verifica el certificado de planta?</span>
              <span className={styles.disclosureMarker} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>
              Que el documento coincide con la versión registrada: se compara
              la huella digital del PDF con la referencia declarada en el lote.
              Prueba la integridad del documento, no la verdad de su contenido.
            </p>
          </details>

          <details className={styles.question}>
            <summary>
              <span>¿La entrega física pasa por JuLit?</span>
              <span className={styles.disclosureMarker} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>
              No. El transporte y la recepción del cargamento ocurren por
              fuera de JuLit. La confirmación del comprador registra que la
              entrega se concretó; no es el mecanismo de entrega.
            </p>
          </details>

          <details className={styles.question}>
            <summary>
              <span>¿Puedo comprar cualquier lote listado?</span>
              <span className={styles.disclosureMarker} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>
              No. Todo lote nace reservado a un comprador: el acuerdo
              comercial se cierra entre las empresas y solo ese comprador
              puede depositar el pago y confirmar la recepción. No hay compra
              abierta.
            </p>
          </details>

          <details className={styles.question}>
            <summary>
              <span>¿Quiénes aparecen en el demo?</span>
              <span className={styles.disclosureMarker} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>
              Empresas, orígenes y lotes ficticios creados para la demostración.
              No representan operaciones ni compañías reales.
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
