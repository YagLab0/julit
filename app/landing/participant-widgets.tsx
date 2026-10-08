import styles from "./participant-widgets.module.css";
import type { LandingDict } from "./i18n";

type ProducerDict = LandingDict["participants"]["producer"]["widget"];
type BuyerDict = LandingDict["participants"]["buyer"]["widget"];

function Skeleton({ w }: { w: number }) {
  return <span className={styles.skel} style={{ width: w }} />;
}

function BeamSvg({ className }: { className: string }) {
  const paths = [
    "M38 0C38 40 120 36 120 92",
    "M120 0V92",
    "M202 0C202 40 120 36 120 92",
  ];
  return (
    <svg
      className={className}
      viewBox="0 0 240 92"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} d={d} className={styles.beamGhost} />
      ))}
      {paths.map((d, i) => (
        <path
          key={`live-${d}`}
          d={d}
          className={styles.beamLive}
          style={{ animationDelay: `${i * 0.6}s` }}
        />
      ))}
    </svg>
  );
}

export function ProducerStructureWidget({ dict }: { dict: ProducerDict }) {
  return (
    <div className={styles.stage} aria-hidden="true">
      <div className={styles.grid} />
      <div className={styles.beamFlow}>
        <div className={styles.sources}>
          {dict.sources.map((label) => (
            <div className={styles.sourceCard} key={label}>
              <span className={styles.sourceLabel}>{label}</span>
              <Skeleton w={44} />
              <Skeleton w={30} />
            </div>
          ))}
        </div>
        <BeamSvg className={styles.beams} />
        <div className={styles.hub}>
          <span className={styles.hubDot} />
          {dict.hub}
        </div>
        <span className={styles.flowLine} />
        <div className={styles.docCard}>
          <div className={styles.docHead}>
            <span className={styles.docTitle}>{dict.docTitle}</span>
            <span className={styles.docChip}>USDC</span>
          </div>
          <Skeleton w={86} />
          <Skeleton w={64} />
          <div className={styles.docTotal} />
        </div>
      </div>
    </div>
  );
}

export function BuyerReviewWidget({ dict }: { dict: BuyerDict }) {
  return (
    <div className={styles.stage} aria-hidden="true">
      <div className={styles.grid} />
      <div className={styles.stackFlow}>
        <div className={styles.stackCard}>
          <div className={styles.stackHead}>
            <svg viewBox="0 0 24 24" className={styles.stackIcon}>
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
            <span>{dict.payment}</span>
            <span className={styles.stackMeta}>USDC</span>
          </div>
          <Skeleton w={120} />
        </div>
        <span className={styles.flowLine} />
        <div className={`${styles.stackCard} ${styles.confirmed}`}>
          <svg viewBox="0 0 24 24" className={styles.checkIcon}>
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" fill="none" />
          </svg>
          <div>
            <span className={styles.confirmedTitle}>{dict.confirmedTitle}</span>
            <span className={styles.confirmedSub}>{dict.confirmedSub}</span>
          </div>
        </div>
        <span className={styles.flowLine} />
        <div className={styles.stackCard}>
          <div className={styles.stackHead}>
            <svg viewBox="0 0 24 24" className={styles.stackIcon}>
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
            </svg>
            <span>{dict.title}</span>
            <span className={styles.stackMeta}>{dict.titleMeta}</span>
          </div>
          <Skeleton w={110} />
          <Skeleton w={80} />
          <div className={styles.docTotal} />
        </div>
      </div>
    </div>
  );
}
