import type { ReactNode } from "react";
import styles from "./commerce.module.css";
import { SolutionShowcase } from "./solution-showcase";
import {
  BuyerReviewWidget,
  ProducerStructureWidget,
} from "./participant-widgets";

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={styles.checkIcon}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m8 12.5 2.5 2.5L16 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettlementMock() {
  return (
    <div className={styles.mockCard}>
      <p className={styles.mockHead}>
        Liquidación <em className={styles.headPill}>instantánea</em>
      </p>
      <ul className={styles.txList}>
        <li>
          <span className={styles.txAsset}>Pago en garantía</span>
          <i className={styles.txArrow} />
          <b>Productor</b>
        </li>
        <li>
          <span className={styles.txAsset}>Costo del servicio</span>
          <i className={styles.txArrow} />
          <b>Tesorería</b>
        </li>
        <li>
          <span className={styles.txAsset}>Título digital</span>
          <i className={styles.txArrow} />
          <b>Se da de baja</b>
        </li>
      </ul>
      <p className={styles.mockFoot}>
        <CheckIcon /> Todo en una sola operación, o nada
      </p>
    </div>
  );
}

function PassportMock() {
  return (
    <div className={styles.mockCard}>
      <p className={styles.mockHead}>
        Pasaporte del lote <em className={styles.headPill}>público</em>
      </p>
      <ul className={styles.mockRows}>
        <li>
          <span>Lote</span>
          <b>0042 · Salinas Grandes</b>
        </li>
        <li>
          <span>Métricas</span>
          <b>Cantidad y pureza declaradas</b>
        </li>
        <li>
          <span>Título digital</span>
          <b>Único e irrepetible</b>
        </li>
        <li>
          <span>Estado</span>
          <b className={styles.tagTeal}>Liquidado</b>
        </li>
        <li>
          <span>Historial</span>
          <b>registro · depósito · liquidación</b>
        </li>
      </ul>
    </div>
  );
}

function CertificateMock() {
  return (
    <div className={styles.mockCard}>
      <div className={styles.docRow}>
        <span className={styles.docIcon}>
          <i className={styles.docBadge}>PDF</i>
        </span>
        <span className={styles.docMeta}>
          <b className={styles.fileName}>certificado-planta.pdf</b>
          <span className={styles.fileCaption}>
            Declarado una sola vez por el productor
          </span>
        </span>
      </div>
      <div className={styles.hashRow}>
        <span>Huella digital</span>
        <code>9f2c…a41b</code>
        <span className={styles.hashCheck}>
          <CheckIcon /> coincide
        </span>
      </div>
      <div className={styles.hashRow}>
        <span>Referenciado por</span>
        <b className={styles.fileName}>3 lotes</b>
      </div>
    </div>
  );
}

function ReservedMock() {
  return (
    <div className={styles.mockCard}>
      <div className={styles.lotRow}>
        <b className={styles.fileName}>Lote 0042</b>
        <span className={styles.lockPill}>
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Comprador designado
        </span>
      </div>
      <p className={styles.fileCaption}>Carbonato de litio · Jujuy</p>
      <div className={styles.hashRow}>
        <span>Acuerdo comercial</span>
        <span className={styles.hashCheck}>negociado en privado</span>
      </div>
      <div className={styles.hashRow}>
        <span>Liquidación</span>
        <span className={styles.hashCheck}>
          solo el comprador designado <CheckIcon />
        </span>
      </div>
    </div>
  );
}

function TabIcon({ path }: { path: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={styles.tabIcon}
    >
      <path d={path} />
    </svg>
  );
}

const slides: {
  tab: string;
  title: string;
  problem: string;
  solution: string;
  icon: ReactNode;
  mock: ReactNode;
}[] = [
  {
    tab: "Pago contra entrega",
    title: "Ni pago sin recibir, ni entrega sin cobrar",
    problem:
      "El pago y la entrega del bien no ocurren al mismo tiempo; alguien asume el riesgo de que la otra parte no cumpla.",
    solution:
      "El pago queda depositado en garantía y solo se libera cuando el comprador confirma la entrega: en ese mismo instante la productora cobra y el título queda dado de baja.",
    icon: <TabIcon path="M4 8h13m-4-4 4 4-4 4M20 16H7m4 4-4-4 4-4" />,
    mock: <SettlementMock />,
  },
  {
    tab: "Registro público",
    title: "Un solo registro para todos",
    problem:
      "Cada parte guarda sus propios datos del lote y reconciliarlos cuesta tiempo y genera disputas.",
    solution:
      "Cada lote tiene un título digital único que concentra su información, y todo su historial queda a la vista en el Pasaporte.",
    icon: (
      <TabIcon path="M6 4h9l3 3v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm4 6h4m-4 4h4" />
    ),
    mock: <PassportMock />,
  },
  {
    tab: "Certificado de planta",
    title: "Un certificado para toda la planta",
    problem:
      "Auditar cada lote por separado no refleja cómo certifica la industria real y multiplica la fricción documental.",
    solution:
      "El productor declara el certificado de su planta una sola vez; cada lote registra su referencia y cualquiera puede comprobar que el documento coincide.",
    icon: (
      <TabIcon path="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8l-4-5zm0 0v5h4M9 15l2 2 4-4" />
    ),
    mock: <CertificateMock />,
  },
  {
    tab: "Compra reservada",
    title: "Operaciones reservadas, no góndola abierta",
    problem:
      "Los acuerdos entre mineras y compradores se negocian en privado, pero los datos comerciales terminan dispersos o públicos.",
    solution:
      "Todo lote nace reservado a un comprador; el acuerdo se cierra entre las empresas y solo ese comprador puede depositar el pago y confirmar la entrega.",
    icon: (
      <TabIcon path="M8 11V7a4 4 0 0 1 8 0v4M5 11h14v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9z" />
    ),
    mock: <ReservedMock />,
  },
];

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
              El pago y la entrega, en el mismo instante.
            </h2>
          </div>
          <p className={`${styles.description} text-muted`}>
            En el comercio B2B de litio, pagar antes de recibir o entregar antes
            de cobrar deja a una de las partes expuesta. JuLit propone cerrar
            esa brecha: el pago viaja en garantía y solo se libera cuando la
            entrega se confirma.
          </p>
        </div>

        <SolutionShowcase slides={slides} />
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
            <h3>Cobrás cuando se confirma la entrega.</h3>
            <ul className={styles.participantList}>
              <li>
                El pago del comprador se libera en el mismo instante en que
                se confirma la entrega.
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
            <h3>El pago no se mueve hasta que confirmás la entrega.</h3>
            <ul className={styles.participantList}>
              <li>
                Depositás el precio del lote en garantía y solo se libera a
                la productora cuando confirmás la recepción: no hay ventana
                de riesgo.
              </li>
              <li>
                Verificás el certificado de planta y el historial del lote antes
                y después de liquidar.
              </li>
              <li>
                Tu confirmación cierra la operación y deja evidencia
                permanente para ambas partes.
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
