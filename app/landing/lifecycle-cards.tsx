import type { ReactNode } from "react";
import { BigBag } from "./big-bag";
import styles from "./lifecycle-cards.module.css";

const lifecycleSteps = [
  {
    number: "01",
    title: "Descubrimiento",
    onchain: false,
    description:
      "Directorio B2B: origen, capacidad y certificación de planta. El acuerdo comercial se negocia en privado entre las empresas.",
  },
  {
    number: "02",
    title: "Tokenización",
    onchain: true,
    description:
      "El productor registra el lote ya reservado a su comprador: nace el título digital (un NFT), que queda en custodia del protocolo.",
  },
  {
    number: "03",
    title: "Liquidación",
    onchain: true,
    description:
      "El comprador designado ejecuta la liquidación: su pago en USDC llega al productor y el título digital llega al comprador, en la misma transacción.",
  },
  {
    number: "04",
    title: "Entrega",
    onchain: false,
    wide: true,
    description:
      "La logística, la aduana y la recepción del cargamento ocurren fuera del protocolo.",
  },
  {
    number: "05",
    title: "Redención",
    onchain: true,
    description:
      "El comprador confirma la recepción: el título se quema y el lote queda marcado como redimido, con un rastro permanente y verificable.",
  },
] as const;

const origins = ["Salar de Olaroz", "Salinas Grandes", "Cauchari"] as const;

const lifecycleRecord = [
  "Título acuñado",
  "Liquidación atómica",
  "Entrega física",
  "Título quemado · redimido",
] as const;

function ArrowRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DirectoryScene() {
  return (
    <div className={styles.mock}>
      <p className={styles.mockTitle}>Directorio de orígenes</p>
      <ul className={styles.directory}>
        {origins.map((origin, index) => (
          <li key={origin}>
            <i className={styles.dirDot} />
            <span className={styles.dirName}>{origin}</span>
            <em className={index === 2 ? styles.pillPrivate : styles.pill}>
              {index === 2 ? "Acuerdo privado" : "Cert. de planta"}
            </em>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TitleScene() {
  return (
    <div className={styles.mock}>
      <div className={styles.fileRow}>
        <div className={styles.fileIcon}>
          <span className={styles.fileBadge}>NFT</span>
        </div>
        <div className={styles.fileMeta}>
          <p className={styles.fileName}>titulo-lote-0042</p>
          <div className={styles.fileBar}>
            <span />
          </div>
          <p className={styles.fileCaption}>
            Suministro 1 · en custodia del protocolo
          </p>
        </div>
      </div>
    </div>
  );
}

function SettlementScene() {
  return (
    <div className={styles.mock}>
      <p className={styles.mockTitle}>Una sola transacción</p>
      <div className={styles.txFrame}>
        <div className={styles.leg}>
          <span className={styles.legFrom}>USDC</span>
          <span className={styles.legArrow}>
            <ArrowRight />
          </span>
          <span className={styles.legTo}>Productor</span>
        </div>
        <div className={styles.leg}>
          <span className={styles.legFrom}>Título digital</span>
          <span className={styles.legArrow}>
            <ArrowRight />
          </span>
          <span className={styles.legTo}>Comprador</span>
        </div>
      </div>
      <p className={styles.legNote}>Las dos patas se ejecutan, o ninguna.</p>
    </div>
  );
}

function RecordScene() {
  return (
    <div className={`${styles.mock} ${styles.mockRecord}`}>
      <ul className={styles.timeline}>
        {lifecycleRecord.map((event) => (
          <li
            key={event}
            className={
              event === "Título quemado · redimido"
                ? styles.timelineDone
                : undefined
            }
          >
            {event}
          </li>
        ))}
      </ul>
    </div>
  );
}

const sceneByNumber: Record<string, ReactNode> = {
  "01": <DirectoryScene />,
  "02": <TitleScene />,
  "03": <SettlementScene />,
  "05": <RecordScene />,
};

export function LifecycleCards() {
  return (
    <ol className={styles.cards}>
      {lifecycleSteps.map((step, index) => (
        <li
          key={step.number}
          className={`${styles.card} ${step.onchain ? styles.cardOnchain : ""} ${
            "wide" in step && step.wide ? styles.cardWide : ""
          }`}
          data-landing-reveal
          data-landing-delay={index * 50}
        >
          <div className={styles.cardTop}>
            <div className={styles.cardMeta}>
              <span className={styles.cardNumber} aria-hidden="true">
                {step.number}
              </span>
              <span className={styles.cardTag}>
                {step.onchain ? "En la cadena" : "Fuera de la cadena"}
              </span>
            </div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
          {step.number === "04" ? (
            <div className={styles.sceneBag} aria-hidden="true">
              <BigBag />
            </div>
          ) : (
            <div className={styles.scene} aria-hidden="true">
              {sceneByNumber[step.number]}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
