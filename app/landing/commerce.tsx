import styles from "./commerce.module.css";
import {
  BuyerReviewWidget,
  ProducerStructureWidget,
} from "./participant-widgets";

export function CommerceSection() {
  return (
    <section
      id="solucion"
      aria-labelledby="commerce-heading"
      className={`${styles.commerce} bg-secondary`}
    >
      <div className={styles.container}>
        <div className={styles.introduction} data-landing-reveal>
          <div>
            <p className="eyebrow">La propuesta JuLit</p>
            <h2 id="commerce-heading" className={styles.heading}>
              Menos fricción entre el origen y la compra.
            </h2>
          </div>
          <p className={`${styles.description} text-muted`}>
            Pagos, informes y registros separados dificultan coordinar una
            operación. JuLit propone conectarlos alrededor de un mismo lote.
          </p>
        </div>

        <div className={styles.commerceGrid}>
          <article
            className={`${styles.commerceCard} bg-background`}
            data-landing-reveal
          >
            <svg
              className={styles.icon}
              viewBox="0 0 32 32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 11h21m-5-5 5 5-5 5M27 21H6m5-5-5 5 5 5" />
            </svg>
            <h3>Pagos sin tantas vueltas</h3>
            <dl className={styles.pair}>
              <div>
                <dt>El problema</dt>
                <dd>
                  Las cartas de crédito suman comisiones, intermediarios y
                  demoras que inmovilizan capital.
                </dd>
              </div>
              <div className={styles.proposal}>
                <dt>La propuesta</dt>
                <dd>
                  Liquidación B2B en USDC sobre Solana, diseñada para reducir la
                  fricción del pago. En la demo, esta etapa es simulada.
                </dd>
              </div>
            </dl>
          </article>

          <article
            className={`${styles.commerceCard} bg-background`}
            data-landing-reveal
            data-landing-delay="50"
          >
            <svg
              className={styles.icon}
              viewBox="0 0 32 32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 4H8a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V11L19 4Z" />
              <path d="M19 4v7h7M11 16h6m-6 5h3m4 1 2 2 5-5" />
            </svg>
            <h3>Documentos cuya integridad se puede comprobar</h3>
            <dl className={styles.pair}>
              <div>
                <dt>El problema</dt>
                <dd>
                  Los informes enviados por correo pueden circular en distintas
                  versiones y perder su relación con el lote.
                </dd>
              </div>
              <div className={styles.proposal}>
                <dt>La propuesta</dt>
                <dd>
                  Asociar el informe del auditor al lote y registrar su huella
                  digital SHA-256 en Solana para detectar cambios respecto del
                  documento registrado.
                </dd>
              </div>
            </dl>
          </article>

          <article
            className={`${styles.commerceCard} bg-background`}
            data-landing-reveal
            data-landing-delay="100"
          >
            <svg
              className={styles.icon}
              viewBox="0 0 32 32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="11" y="11" width="10" height="10" rx="2" />
              <circle cx="6" cy="6" r="3" />
              <circle cx="26" cy="6" r="3" />
              <circle cx="16" cy="27" r="3" />
              <path d="m8 8 4 4m12-4-4 4m-4 9v3" />
            </svg>
            <h3>Una referencia común entre actores</h3>
            <dl className={styles.pair}>
              <div>
                <dt>El problema</dt>
                <dd>
                  Los sistemas desconectados obligan a cotejar información y
                  conciliar registros manualmente.
                </dd>
              </div>
              <div className={styles.proposal}>
                <dt>La propuesta</dt>
                <dd>
                  Un pasaporte por lote que reúna origen, datos declarados y
                  evidencia de auditoría como referencia compartida entre los
                  participantes.
                </dd>
              </div>
            </dl>
          </article>

          <article
            className={`${styles.commerceCard} bg-background`}
            data-landing-reveal
            data-landing-delay="150"
          >
            <svg
              className={styles.icon}
              viewBox="0 0 32 32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="4" y="5" width="24" height="22" rx="3" />
              <path d="M4 11h24M8 8h.01M11 8h.01" />
              <circle cx="15" cy="18" r="4" />
              <path d="m18 21 4 3" />
            </svg>
            <h3>Evidencia más fácil de consultar</h3>
            <dl className={styles.pair}>
              <div>
                <dt>El problema</dt>
                <dd>
                  Revisar documentación dispersa complica las evaluaciones de
                  compradores, auditores y autoridades.
                </dd>
              </div>
              <div className={styles.proposal}>
                <dt>La propuesta</dt>
                <dd>
                  Un pasaporte público accesible desde un navegador mediante QR.
                  La información ayuda a la revisión; no sustituye una
                  evaluación regulatoria ni una certificación oficial.
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </div>
    </section>
  );
}

export function ParticipantsSection() {
  return (
    <section
      id="participantes"
      aria-labelledby="participants-heading"
      className={styles.participants}
    >
      <div className={styles.container}>
        <div className={styles.participantsIntroduction} data-landing-reveal>
          <p className="eyebrow">Diseñado para el comercio B2B</p>
          <h2 id="participants-heading" className={styles.heading}>
            Más claridad para quienes producen y quienes compran.
          </h2>
        </div>

        <div className={styles.participantsGrid}>
          <article className={styles.participantCard} data-landing-reveal>
            <ProducerStructureWidget />
            <h3>Para productores</h3>
            <p className="text-muted">
              Presentá el origen y la evidencia de tus lotes en una estructura
              común. Coordiná la auditoría y las condiciones comerciales sin
              depender de información dispersa.
            </p>
          </article>

          <article
            className={styles.participantCard}
            data-landing-reveal
            data-landing-delay="50"
          >
            <BuyerReviewWidget />
            <h3>Para compradores</h3>
            <p className="text-muted">
              Revisá los datos declarados, la documentación y la evaluación del
              auditor antes de decidir. Identificá qué evidencia respalda cada
              lote y qué queda pendiente de comprobar.
            </p>
          </article>
        </div>

        <aside className={styles.auditorNote} data-landing-reveal>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Z" />
            <path d="m8 12 3 3 5-6" />
          </svg>
          <p>
            Los auditores aportan una evaluación independiente. El pasaporte
            organiza la evidencia; no reemplaza su criterio profesional.
          </p>
        </aside>
      </div>
    </section>
  );
}
