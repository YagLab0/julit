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
            <p className="eyebrow">Pasaporte digital de lote</p>
            <h2 id="passport-heading" className={styles.heading}>
              La evidencia de cada lote, en un solo lugar.
            </h2>
            <p className={styles.description}>
              Una estructura común para consultar de dónde proviene el litio,
              qué datos se declararon y qué documentación respalda la evaluación
              del auditor.
            </p>
            <p className={styles.integrityNote}>
              Verificar la integridad de un documento no demuestra por sí solo
              que sus datos sean verdaderos ni que una muestra corresponda al
              cargamento físico.
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
                    Registro de evidencia
                  </span>
                </div>
                <div className={styles.documentHeader}>
                  <p className={styles.documentTitle}>
                    Pasaporte
                    <br />
                    digital de lote
                  </p>
                  <span className={styles.documentMaterial}>Li₂CO₃</span>
                </div>
                <ol className={styles.fields}>
                  {[
                    {
                      title: "Origen y productor",
                      description:
                        "Procedencia del material e identidad del productor.",
                    },
                    {
                      title: "Cantidad y pureza química",
                      description:
                        "Volumen declarado y composición del carbonato.",
                    },
                    {
                      title: "Huella hídrica y de carbono",
                      description:
                        "Datos ambientales asociados a la producción.",
                    },
                    {
                      title: "Informe del auditor",
                      description:
                        "Documento que respalda la evaluación del lote.",
                    },
                    {
                      title: "Referencia de integridad",
                      description:
                        "Huella digital para contrastar la versión del informe.",
                    },
                    {
                      title: "Estado del lote",
                      description:
                        "Situación del lote dentro del proceso comercial.",
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
              Vista conceptual del pasaporte. No representa un lote real.
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
              <span>¿Qué puedo explorar hoy?</span>
              <span className={styles.disclosureMarker} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>
              La demo permite recorrer el mapa y el catálogo de orígenes de
              JuLit. Las identidades de productores y orígenes utilizadas en la
              demostración son ficticias. La liquidación es simulada y no
              implica pagos reales.
            </p>
          </details>

          <details className={styles.question}>
            <summary>
              <span>¿JuLit paga actualmente en USDC?</span>
              <span className={styles.disclosureMarker} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>
              No. La liquidación B2B en USDC sobre Solana forma parte de la
              propuesta del producto. La demo no transfiere tokens ni acredita
              fondos recibidos.
            </p>
          </details>

          <details className={styles.question}>
            <summary>
              <span>¿Qué demuestra la huella digital del informe?</span>
              <span className={styles.disclosureMarker} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>
              Permite comprobar que el archivo coincide con la versión
              registrada. No certifica por sí sola la veracidad de sus
              afirmaciones, el cumplimiento ambiental ni la correspondencia
              física entre una muestra y un cargamento.
            </p>
          </details>

          <details className={styles.question}>
            <summary>
              <span>
                ¿El pasaporte garantiza el cumplimiento de la normativa europea?
              </span>
              <span className={styles.disclosureMarker} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>
              No. El pasaporte digital de lote de JuLit organiza información y
              evidencia para su revisión. No equivale al pasaporte oficial de
              una batería ni sustituye los requisitos legales, las evaluaciones
              o las certificaciones aplicables.
            </p>
          </details>

          <details className={styles.question}>
            <summary>
              <span>¿Necesito una wallet para consultar un pasaporte?</span>
              <span className={styles.disclosureMarker} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>
              La propuesta contempla una consulta pública desde el navegador,
              sin instalar una wallet. Las operaciones en cadena requieren una
              wallet. La sección de pasaporte de esta landing es explicativa, no
              una verificación de un lote real.
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
