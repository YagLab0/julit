import type { ReactNode } from "react";
import { BigBag } from "./big-bag";
import styles from "./lifecycle-cards.module.css";

const lifecycleSteps = [
  {
    number: "01",
    title: "Descubrimiento",
    onchain: false,
    description:
      "El comprador encuentra productores y orígenes en el directorio; el acuerdo comercial se cierra entre las empresas, como siempre.",
  },
  {
    number: "02",
    title: "Registro",
    onchain: true,
    description:
      "El productor publica el lote ya reservado a su comprador: nace su título digital único, que queda resguardado por JuLit.",
  },
  {
    number: "03",
    title: "Depósito en garantía",
    onchain: true,
    description:
      "El comprador deposita el precio del lote en garantía: queda bloqueado hasta que confirme la entrega.",
  },
  {
    number: "04",
    title: "Entrega",
    onchain: false,
    wide: true,
    description:
      "La logística, la aduana y la recepción del cargamento ocurren entre las partes, como en cualquier operación.",
  },
  {
    number: "05",
    title: "Liquidación",
    onchain: true,
    description:
      "El comprador confirma la recepción: en ese mismo instante la productora cobra el pago depositado y el título queda dado de baja, con un registro permanente y verificable.",
  },
] as const;

const origins = ["Salar de Olaroz", "Salinas Grandes", "Cauchari"] as const;

const lifecycleRecord = [
  "Título emitido",
  "Pago depositado en garantía",
  "Entrega física",
  "Título dado de baja · pago liberado",
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
          <span className={styles.fileBadge}>Título</span>
        </div>
        <div className={styles.fileMeta}>
          <p className={styles.fileName}>titulo-lote-0042</p>
          <div className={styles.fileBar}>
            <span />
          </div>
          <p className={styles.fileCaption}>
            Título único · resguardado por JuLit
          </p>
        </div>
      </div>
    </div>
  );
}

function FundingScene() {
  return (
    <div className={styles.mock}>
      <p className={styles.mockTitle}>El pago queda en garantía</p>
      <div className={styles.txFrame}>
        <div className={styles.leg}>
          <span className={styles.legFrom}>Pago</span>
          <span className={styles.legArrow}>
            <ArrowRight />
          </span>
          <span className={styles.legTo}>Depósito en garantía</span>
        </div>
        <div className={styles.leg}>
          <span className={styles.legFrom}>Título digital</span>
          <span className={styles.legArrow}>
            <ArrowRight />
          </span>
          <span className={styles.legTo}>Sigue resguardado</span>
        </div>
      </div>
      <p className={styles.legNote}>
        Nada se libera hasta la confirmación de entrega.
      </p>
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
              event === "Título dado de baja · pago liberado"
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
  "03": <FundingScene />,
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
                {step.onchain ? "Registro verificable" : "Entre las partes"}
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
