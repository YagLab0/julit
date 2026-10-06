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
              El pago y el lote, en la misma transacción.
            </h2>
          </div>
          <p className={`${styles.description} text-muted`}>
            En el comercio B2B de litio, pagar antes de recibir o entregar antes
            de cobrar deja a una de las partes expuesta. JuLit propone cerrar
            esa brecha alrededor de un título digital por lote.
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
            <h3>Liquidación sin ventana de riesgo</h3>
            <dl className={styles.pair}>
              <div>
                <dt>El problema</dt>
                <dd>
                  En una operación común, el pago y la entrega del bien no
                  ocurren al mismo tiempo; alguien asume el riesgo de que la
                  otra parte no cumpla.
                </dd>
              </div>
              <div className={styles.proposal}>
                <dt>La propuesta</dt>
                <dd>
                  La liquidación es una sola transacción: el pago del comprador
                  y el título digital del lote cambian de manos juntos, o no
                  cambia nada.
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
              <rect x="11" y="11" width="10" height="10" rx="2" />
              <circle cx="6" cy="6" r="3" />
              <circle cx="26" cy="6" r="3" />
              <circle cx="16" cy="27" r="3" />
              <path d="m8 8 4 4m12-4-4 4m-4 9v3" />
            </svg>
            <h3>Un solo registro para todos</h3>
            <dl className={styles.pair}>
              <div>
                <dt>El problema</dt>
                <dd>
                  Cada parte guarda sus propios datos del lote — origen,
                  cantidad, pureza, estado — y reconciliarlos cuesta tiempo y
                  genera disputas.
                </dd>
              </div>
              <div className={styles.proposal}>
                <dt>La propuesta</dt>
                <dd>
                  El título digital concentra la referencia del lote y su
                  historial es consultable públicamente en el Pasaporte.
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
              <path d="M19 4H8a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V11L19 4Z" />
              <path d="M19 4v7h7M11 16h6m-6 5h3m4 1 2 2 5-5" />
            </svg>
            <h3>Evidencia a nivel planta</h3>
            <dl className={styles.pair}>
              <div>
                <dt>El problema</dt>
                <dd>
                  Auditar cada lote por separado no refleja cómo certifica la
                  industria real y multiplica la fricción documental.
                </dd>
              </div>
              <div className={styles.proposal}>
                <dt>La propuesta</dt>
                <dd>
                  El productor declara el certificado de su planta una sola vez;
                  cada lote registra su referencia y cualquiera puede comprobar
                  que el documento coincide con la versión registrada.
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
            <h3>Operaciones reservadas, no góndola abierta</h3>
            <dl className={styles.pair}>
              <div>
                <dt>El problema</dt>
                <dd>
                  Los acuerdos entre mineras y compradores se negocian en
                  privado, pero los datos comerciales terminan dispersos o
                  públicos.
                </dd>
              </div>
              <div className={styles.proposal}>
                <dt>La propuesta</dt>
                <dd>
                  Todo lote nace reservado a un comprador designado; el acuerdo
                  se cierra entre las empresas y solo el comprador designado
                  puede liquidarlo.
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
          <p className="eyebrow">Para cada lado de la operación</p>
          <h2 id="participants-heading" className={styles.heading}>
            Más claridad para quienes producen y quienes compran.
          </h2>
        </div>

        <div className={styles.participantsGrid}>
          <article className={styles.participantCard} data-landing-reveal>
            <ProducerStructureWidget />
            <p className={`eyebrow ${styles.participantLabel}`}>Productor</p>
            <h3>Cobrás cuando entregás el título.</h3>
            <ul className={styles.participantList}>
              <li>
                El pago del comprador llega en la misma transacción que
                transfiere el título digital.
              </li>
              <li>
                Declarás el certificado de planta una sola vez y cada lote lo
                referencia.
              </li>
              <li>El historial del lote queda verificable por cualquiera.</li>
            </ul>
          </article>

          <article
            className={styles.participantCard}
            data-landing-reveal
            data-landing-delay="50"
          >
            <BuyerReviewWidget />
            <p className={`eyebrow ${styles.participantLabel}`}>Comprador</p>
            <h3>Pagás solo si recibís el título.</h3>
            <ul className={styles.participantList}>
              <li>
                El pago y el título digital cambian de manos en la misma
                transacción: no hay ventana de riesgo.
              </li>
              <li>
                Verificás el certificado de planta y el historial del lote antes
                y después de liquidar.
              </li>
              <li>
                Confirmás la recepción con la redención, que cierra el ciclo con
                evidencia permanente.
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
