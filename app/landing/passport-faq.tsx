import { ProcessWidgetMotion } from "./process-widget-motion";
import styles from "./passport-faq.module.css";
import type { LandingDict } from "./i18n";

export function PassportSection({ dict }: { dict: LandingDict["passport"] }) {
  return (
    <section
      id="pasaporte"
      aria-labelledby="passport-heading"
      className="bg-background text-foreground"
    >
      <div className={styles.container}>
        <div className={styles.passportLayout}>
          <div className={styles.passportCopy} data-landing-reveal>
            <p className="eyebrow">{dict.eyebrow}</p>
            <h2 id="passport-heading" className={styles.heading}>
              {dict.heading}
            </h2>
            <p className={styles.description}>{dict.description}</p>
            <p className={styles.integrityNote}>{dict.integrityNote}</p>
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
                    {dict.doc.edition}
                  </span>
                </div>
                <div className={styles.documentHeader}>
                  <p className={styles.documentTitle}>
                    {dict.doc.titleTop}
                    <br />
                    {dict.doc.titleBottom}
                  </p>
                  <span className={styles.documentMaterial}>Li₂CO₃</span>
                </div>
                <ol className={styles.fields}>
                  {dict.doc.fields.map((field, index) => (
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
                  <span>{dict.doc.footerLeft}</span>
                  <span>{dict.doc.footerRight}</span>
                </div>
              </div>
            </ProcessWidgetMotion>
            <figcaption className={styles.conceptCaption}>
              {dict.caption}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

export function FaqSection({ dict }: { dict: LandingDict["faq"] }) {
  return (
    <section
      id="preguntas-frecuentes"
      aria-labelledby="faq-heading"
      className="bg-background text-foreground"
    >
      <div className={`${styles.container} ${styles.faqLayout}`}>
        <div className={styles.faqIntro} data-landing-reveal>
          <h2 id="faq-heading" className={styles.heading}>
            {dict.heading}
          </h2>
        </div>

        <div
          className={styles.questions}
          data-landing-reveal
          data-landing-delay="50"
        >
          {dict.items.map((item) => (
            <details key={item.q} className={styles.question}>
              <summary>
                <span>{item.q}</span>
                <span className={styles.disclosureMarker} aria-hidden="true" />
              </summary>
              <p className={styles.answer}>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
