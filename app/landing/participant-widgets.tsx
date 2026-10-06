import { ProcessWidgetMotion } from "./process-widget-motion";
import styles from "./participant-widgets.module.css";

function EvidenceMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 1.5h5.5L13 5v9.5H4z" />
      <path d="M9.5 1.5V5H13M6.5 8.5h4M6.5 11.5h4" />
    </svg>
  );
}

export function ProducerStructureWidget() {
  return (
    <ProcessWidgetMotion className={styles.stage} decorative continuous>
      <div className={styles.grid} />
      <svg
        className={styles.flow}
        viewBox="0 0 100 36"
        preserveAspectRatio="none"
      >
        <path className={styles.ghost} d="M22 0C22 24 50 24 50 36" />
        <path className={styles.ghost} d="M78 0C78 24 50 24 50 36" />
        <path
          className={styles.live}
          data-process-draw=""
          d="M22 0C22 24 50 24 50 36"
        />
        <path
          className={styles.live}
          data-process-draw=""
          d="M78 0C78 24 50 24 50 36"
        />
      </svg>
      <div className={`${styles.pole} ${styles.origin}`}>
        <span className={styles.originMark} />
        <span>Origen</span>
      </div>
      <div className={`${styles.pole} ${styles.evidence}`}>
        <span className={styles.evidenceMark}>
          <EvidenceMark />
        </span>
        <span>Cert. de planta</span>
      </div>
      <div className={styles.structure}>
        <span className={styles.structureDot} />
        Título digital
      </div>
    </ProcessWidgetMotion>
  );
}

const settlementLegs = ["Pago", "Título", "Liquidación"] as const;

export function BuyerReviewWidget() {
  return (
    <ProcessWidgetMotion className={styles.stage} decorative continuous>
      <div className={styles.grid} />
      <div className={styles.review}>
        <div className={styles.linked}>
          <span className={styles.spineGhost} />
          <span className={styles.spineLive} data-process-fill="" />
          {settlementLegs.map((label) => (
            <div className={styles.station} key={label}>
              <span className={styles.node} data-process-node="">
                <span className={styles.nodePaint} data-process-paint="" />
              </span>
              <span>{label}</span>
            </div>
          ))}
          <div className={`${styles.station} ${styles.settled}`}>
            <span className={styles.node} data-process-node="">
              <span className={styles.nodePaint} data-process-paint="" />
            </span>
            <span>Rastro</span>
          </div>
        </div>
        <div className={styles.pendingStation}>
          <span className={styles.approach} data-process-retreat="" />
          <span className={styles.ring} />
          <span>Entrega</span>
        </div>
      </div>
    </ProcessWidgetMotion>
  );
}
