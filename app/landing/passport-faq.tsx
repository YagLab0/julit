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
              El Pasaporte es la vista pública del ciclo de vida del lote: su
              título, sus transacciones y su certificado de planta, verificables
              por cualquiera.
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
                        "El NFT del lote y la custodia que lo resguarda hasta la redención.",
                    },
                    {
                      title: "Estado del ciclo",
                      description:
                        "Listado, fondeado o redimido: dónde está el lote en su recorrido.",
                    },
                    {
                      title: "Transacciones",
                      description:
                        "Registro, fondeo y redención, enlazadas a la cadena.",
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
              <span>¿Los tokens y la liquidación tienen valor real?</span>
              <span className={styles.disclosureMarker} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>
              No. La demo corre en Solana Devnet con dUSDC, un token de prueba
              creado por el proyecto. Las transacciones son reales — se ejecutan
              y quedan registradas en la cadena — pero los tokens no tienen
              valor comercial.
            </p>
          </details>

          <details className={styles.question}>
            <summary>
              <span>¿Qué es el título digital del lote?</span>
              <span className={styles.disclosureMarker} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>
              Un NFT que representa el derecho contractual sobre el lote. Vive
              en custodia del protocolo desde el registro hasta la redención, y
              se quema cuando el comprador confirma la recepción. Es una
              representación digital de ese derecho, no un título legal
              automático.
            </p>
          </details>

          <details className={styles.question}>
            <summary>
              <span>¿Qué verifica el certificado de planta?</span>
              <span className={styles.disclosureMarker} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>
              Que el documento coincide con la versión registrada: se compara el
              resumen SHA-256 del PDF con la referencia declarada en el lote.
              Prueba la integridad del documento, no la verdad de su contenido.
            </p>
          </details>

          <details className={styles.question}>
            <summary>
              <span>¿La entrega física pasa por JuLit?</span>
              <span className={styles.disclosureMarker} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>
              No. El transporte y la recepción del cargamento ocurren fuera del
              protocolo. La redención es la confirmación en la cadena de que la
              entrega se concretó, no el mecanismo de entrega.
            </p>
          </details>

          <details className={styles.question}>
            <summary>
              <span>¿Puedo comprar cualquier lote listado?</span>
              <span className={styles.disclosureMarker} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>
              No. Todo lote nace reservado a un comprador designado: el acuerdo
              comercial se negocia entre las empresas y solo el comprador
              designado puede fondearlo. No hay compra abierta.
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
