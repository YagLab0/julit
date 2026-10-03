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
            <div className={styles.document}>
              <div className={styles.documentHeader}>
                <p className={styles.documentTitle}>
                  Pasaporte digital de lote
                </p>
                <svg
                  className={styles.documentEmblem}
                  viewBox="0 0 48 48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M24 4 41 14v20L24 44 7 34V14L24 4Z" />
                  <path d="m7 14 17 10 17-10M24 24v20M15.5 9 33 19v10L15.5 39" />
                </svg>
              </div>

              <ul className={styles.fields}>
                <li className={styles.field}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 9c0 4.2-6 9-6 9S6 13.2 6 9a6 6 0 1 1 12 0Z" />
                    <circle cx="12" cy="9" r="2" />
                    <path d="M6 18H4v3h16v-3h-2" />
                  </svg>
                  <span>Origen y productor</span>
                </li>
                <li className={styles.field}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
                    <path d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5.2l8 4.6" />
                  </svg>
                  <span>Cantidad y pureza química</span>
                </li>
                <li className={styles.field}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M10 3S4 9.2 4 13a6 6 0 0 0 10.3 4.2M7 13a3 3 0 0 0 3 3" />
                    <path d="M14 12c0-3 3-5 7-5 0 5-1.5 8-5 8M12 20c0-4 3-7 6-9" />
                  </svg>
                  <span>Huella hídrica y de carbono</span>
                </li>
                <li className={styles.field}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14 3H5v18h14V8l-5-5Z" />
                    <path d="M14 3v5h5M8 12h8M8 16h5" />
                  </svg>
                  <span>Informe del auditor</span>
                </li>
                <li className={styles.field}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m10 7 2-2a5 5 0 0 1 7 7l-2 2M14 17l-2 2a5 5 0 0 1-7-7l2-2M8 16l8-8" />
                  </svg>
                  <span>Referencia de integridad</span>
                </li>
                <li className={styles.field}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="5" cy="5" r="2" />
                    <circle cx="19" cy="12" r="2" />
                    <circle cx="5" cy="19" r="2" />
                    <path d="M5 7v10M7 5h3a3 3 0 0 1 3 3v1a3 3 0 0 0 3 3h1" />
                  </svg>
                  <span>Estado del lote</span>
                </li>
              </ul>
            </div>
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
