import styles from "./hero-flow.module.css";

function HexMark() {
  return (
    <svg viewBox="0 0 80 127" aria-hidden="true">
      <path
        d="M40.2 0c14.4 0 27.9 7.6 35.1 20.2l13.2 22.9c7.2 12.5 7.2 28 0 40.5l-13.2 23c-7.2 12.4-20.7 20.2-35.1 20.2H40.2c-14.4 0-28-7.6-35.1-20.2L-8.1 83.7c-7.2-12.5-7.2-28 0-40.5L5.1 20.2C12.4 7.8 25.8 0 40.2 0Z"
        fill="currentColor"
        transform="translate(8.1)"
      />
    </svg>
  );
}

const beamPaths = [
  "M52 0C52 56 160 48 160 108",
  "M160 0V108",
  "M268 0C268 56 160 48 160 108",
];

function Beams() {
  return (
    <svg
      className={styles.beams}
      viewBox="0 0 320 108"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      {beamPaths.map((d) => (
        <path key={d} d={d} className={styles.beamGhost} />
      ))}
      {beamPaths.map((d, i) => (
        <path
          key={`live-${d}`}
          d={d}
          className={styles.beamLive}
          style={{ animationDelay: `${i * 0.7}s` }}
        />
      ))}
    </svg>
  );
}

const inputs = [
  { label: "Lote 0042", meta: "reservado" },
  { label: "Título", meta: "NFT · 1" },
  { label: "Pago", meta: "USDC" },
];

function SideCell({ flip }: { flip?: boolean }) {
  return (
    <div className={`${styles.cellSide} ${flip ? styles.flip : ""}`}>
      <div className={styles.cellHatch} />
      <div className={styles.cellBottom}>
        <div className={styles.cellChips}>
          <span />
          <span />
          <span />
        </div>
        <div className={styles.cellBars}>
          <span style={{ width: 96 }} />
          <span style={{ width: 60 }} />
        </div>
        <span className={styles.cellCaption}>
          {flip ? "una sola transacción" : "entrega contra pago"}
        </span>
      </div>
    </div>
  );
}

export function HeroFlow() {
  return (
    <div className={styles.wrap} aria-hidden="true">
      <SideCell />
      <div className={styles.cellFlow}>
        <div className={styles.inputs}>
          {inputs.map(({ label, meta }) => (
            <div className={styles.inputCard} key={label}>
              <span className={styles.inputLabel}>{label}</span>
              <span className={styles.inputMeta}>{meta}</span>
              <span className={styles.inputBar} />
              <span className={styles.inputBar} style={{ width: "58%" }} />
            </div>
          ))}
        </div>
        <Beams />
        <div className={styles.node}>
          <HexMark />
        </div>
        <span className={styles.nodeLine} />
        <div className={styles.doc}>
          <div className={styles.docHead}>
            <span className={styles.docTitle}>settle_lot</span>
            <span className={styles.docChip}>confirmada</span>
          </div>
          <div className={styles.docLegs}>
            <span>
              USDC <i /> Productor
            </span>
            <span>
              Título <i /> Comprador
            </span>
          </div>
        </div>
      </div>
      <SideCell flip />
    </div>
  );
}
