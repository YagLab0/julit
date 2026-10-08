import type { ReactNode } from "react";
import { BigBag } from "./big-bag";
import styles from "./lifecycle-cards.module.css";
import type { LandingDict } from "./i18n";

type Dict = LandingDict["process"];

/** Step layout metadata: position, on-chain flag and wide card are
 *  structural; copy comes from the locale dictionary. */
const stepMeta = [
  { number: "01", onchain: false },
  { number: "02", onchain: true },
  { number: "03", onchain: true },
  { number: "04", onchain: false, wide: true },
  { number: "05", onchain: true },
] as const;

const origins = ["Salar de Olaroz", "Salinas Grandes", "Cauchari"] as const;

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

function DirectoryScene({ dict }: { dict: Dict["scenes"] }) {
  return (
    <div className={styles.mock}>
      <p className={styles.mockTitle}>{dict.directoryTitle}</p>
      <ul className={styles.directory}>
        {origins.map((origin, index) => (
          <li key={origin}>
            <i className={styles.dirDot} />
            <span className={styles.dirName}>{origin}</span>
            <em className={index === 2 ? styles.pillPrivate : styles.pill}>
              {index === 2 ? dict.privatePill : dict.certPill}
            </em>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TitleScene({ dict }: { dict: Dict["scenes"] }) {
  return (
    <div className={styles.mock}>
      <div className={styles.fileRow}>
        <div className={styles.fileIcon}>
          <span className={styles.fileBadge}>{dict.titleBadge}</span>
        </div>
        <div className={styles.fileMeta}>
          <p className={styles.fileName}>{dict.titleFile}</p>
          <div className={styles.fileBar}>
            <span />
          </div>
          <p className={styles.fileCaption}>{dict.titleCaption}</p>
        </div>
      </div>
    </div>
  );
}

function FundingScene({ dict }: { dict: Dict["scenes"] }) {
  return (
    <div className={styles.mock}>
      <p className={styles.mockTitle}>{dict.fundingTitle}</p>
      <div className={styles.txFrame}>
        {dict.fundingLegs.map((leg) => (
          <div key={leg.from} className={styles.leg}>
            <span className={styles.legFrom}>{leg.from}</span>
            <span className={styles.legArrow}>
              <ArrowRight />
            </span>
            <span className={styles.legTo}>{leg.to}</span>
          </div>
        ))}
      </div>
      <p className={styles.legNote}>{dict.fundingNote}</p>
    </div>
  );
}

function RecordScene({ dict }: { dict: Dict["scenes"] }) {
  const last = dict.record.length - 1;
  return (
    <div className={`${styles.mock} ${styles.mockRecord}`}>
      <ul className={styles.timeline}>
        {dict.record.map((event, index) => (
          <li
            key={event}
            className={index === last ? styles.timelineDone : undefined}
          >
            {event}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LifecycleCards({ dict }: { dict: Dict }) {
  const sceneByNumber: Record<string, ReactNode> = {
    "01": <DirectoryScene dict={dict.scenes} />,
    "02": <TitleScene dict={dict.scenes} />,
    "03": <FundingScene dict={dict.scenes} />,
    "05": <RecordScene dict={dict.scenes} />,
  };

  return (
    <ol className={styles.cards}>
      {stepMeta.map((meta, index) => {
        const step = dict.steps[index];
        return (
          <li
            key={meta.number}
            className={`${styles.card} ${meta.onchain ? styles.cardOnchain : ""} ${
              "wide" in meta && meta.wide ? styles.cardWide : ""
            }`}
            data-landing-reveal
            data-landing-delay={index * 50}
          >
            <div className={styles.cardTop}>
              <div className={styles.cardMeta}>
                <span className={styles.cardNumber} aria-hidden="true">
                  {meta.number}
                </span>
                <span className={styles.cardTag}>
                  {meta.onchain ? dict.tags.onchain : dict.tags.offchain}
                </span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
            {meta.number === "04" ? (
              <div className={styles.sceneBag} aria-hidden="true">
                <BigBag />
              </div>
            ) : (
              <div className={styles.scene} aria-hidden="true">
                {sceneByNumber[meta.number]}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
