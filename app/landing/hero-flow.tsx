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

const inPaths = [
  "M52 0C52 56 160 48 160 108",
  "M160 0V108",
  "M268 0C268 56 160 48 160 108",
];

const outPaths = ["M160 0C160 44 84 40 84 84", "M160 0C160 44 236 40 236 84"];

function Beams({ paths, flip }: { paths: string[]; flip?: boolean }) {
  return (
    <svg
      className={styles.beams}
      viewBox={`0 0 320 ${flip ? 84 : 108}`}
      aria-hidden="true"
      preserveAspectRatio="none"
      data-flip={flip || undefined}
    >
      {paths.map((d) => (
        <path key={d} d={d} className={styles.beamGhost} />
      ))}
      {paths.map((d, i) => (
        <path
          key={`live-${d}`}
          d={d}
          className={styles.beamLive}
          style={{ animationDelay: `${i * 0.7 + (flip ? 0.4 : 0)}s` }}
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

const outputs = [
  { asset: "USDC", to: "Productor" },
  { asset: "Título", to: "Comprador" },
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
        <Beams paths={inPaths} />
        <div className={styles.nodeWrap}>
          <div className={styles.node}>
            <HexMark />
          </div>
          <span className={styles.nodeLabel}>settle_lot</span>
        </div>
        <Beams paths={outPaths} flip />
        <div className={styles.outputs}>
          {outputs.map(({ asset, to }) => (
            <div className={styles.outCard} key={to}>
              <span className={styles.outAsset}>{asset}</span>
              <svg viewBox="0 0 24 24" className={styles.outArrow}>
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
              <span className={styles.outTo}>{to}</span>
            </div>
          ))}
        </div>
        <span className={styles.txChip}>
          <span className={styles.txDot} />
          confirmada · una sola transacción
        </span>
      </div>
      <SideCell flip />
    </div>
  );
}
