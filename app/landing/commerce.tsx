import type { ReactNode } from "react";
import styles from "./commerce.module.css";
import { SolutionShowcase } from "./solution-showcase";
import {
  BuyerReviewWidget,
  ProducerStructureWidget,
} from "./participant-widgets";
import type { LandingDict } from "./i18n";

type Dict = LandingDict["commerce"];
type ParticipantsDict = LandingDict["participants"];

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

function SettlementMock({ dict }: { dict: Dict["settlementMock"] }) {
  return (
    <div className={styles.mockCard}>
      <p className={styles.mockHead}>
        {dict.title} <em className={styles.headPill}>{dict.pill}</em>
      </p>
      <ul className={styles.txList}>
        {dict.rows.map((row) => (
          <li key={row.asset}>
            <span className={styles.txAsset}>{row.asset}</span>
            <i className={styles.txArrow} />
            <b>{row.to}</b>
          </li>
        ))}
      </ul>
      <p className={styles.mockFoot}>
        <CheckIcon /> {dict.foot}
      </p>
    </div>
  );
}

function PassportMock({ dict }: { dict: Dict["passportMock"] }) {
  return (
    <div className={styles.mockCard}>
      <p className={styles.mockHead}>
        {dict.title} <em className={styles.headPill}>{dict.pill}</em>
      </p>
      <ul className={styles.mockRows}>
        {dict.rows.map((row) => (
          <li key={row.label}>
            <span>{row.label}</span>
            <b className={"tag" in row && row.tag ? styles.tagTeal : undefined}>
              {row.value}
            </b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpecSheetMock({ dict }: { dict: Dict["specSheetMock"] }) {
  return (
    <div className={styles.mockCard}>
      <div className={styles.docRow}>
        <span className={styles.docIcon}>
          <i className={styles.docBadge}>PDF</i>
        </span>
        <span className={styles.docMeta}>
          <b className={styles.fileName}>{dict.fileName}</b>
          <span className={styles.fileCaption}>{dict.caption}</span>
        </span>
      </div>
      <div className={styles.hashRow}>
        <span>{dict.hashLabel}</span>
        <code>9f2c…a41b</code>
        <span className={styles.hashCheck}>
          <CheckIcon /> {dict.hashCheck}
        </span>
      </div>
      <div className={styles.hashRow}>
        <span>{dict.refLabel}</span>
        <b className={styles.fileName}>{dict.refValue}</b>
      </div>
    </div>
  );
}

function ReservedMock({ dict }: { dict: Dict["reservedMock"] }) {
  return (
    <div className={styles.mockCard}>
      <div className={styles.lotRow}>
        <b className={styles.fileName}>{dict.title}</b>
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
          {dict.pill}
        </span>
      </div>
      <p className={styles.fileCaption}>{dict.caption}</p>
      <div className={styles.hashRow}>
        <span>{dict.agreementLabel}</span>
        <span className={styles.hashCheck}>{dict.agreementValue}</span>
      </div>
      <div className={styles.hashRow}>
        <span>{dict.settlementLabel}</span>
        <span className={styles.hashCheck}>
          {dict.settlementValue} <CheckIcon />
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

const SLIDE_ICONS = [
  <TabIcon key="dvp" path="M4 8h13m-4-4 4 4-4 4M20 16H7m4 4-4-4 4-4" />,
  <TabIcon
    key="record"
    path="M6 4h9l3 3v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm4 6h4m-4 4h4"
  />,
  <TabIcon
    key="spec"
    path="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8l-4-5zm0 0v5h4M9 15l2 2 4-4"
  />,
  <TabIcon
    key="reserved"
    path="M8 11V7a4 4 0 0 1 8 0v4M5 11h14v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9z"
  />,
];

export function CommerceSection({
  dict,
  slidesLabel,
}: {
  dict: Dict;
  slidesLabel: string;
}) {
  const slideMocks: ReactNode[] = [
    <SettlementMock key="dvp" dict={dict.settlementMock} />,
    <PassportMock key="record" dict={dict.passportMock} />,
    <SpecSheetMock key="spec" dict={dict.specSheetMock} />,
    <ReservedMock key="reserved" dict={dict.reservedMock} />,
  ];
  const slides = dict.slides.map((slide, index) => ({
    ...slide,
    icon: SLIDE_ICONS[index],
    mock: slideMocks[index],
  }));

  return (
    <section
      id="solucion"
      aria-labelledby="commerce-heading"
      className={`${styles.commerce} bg-secondary`}
    >
      <div className={styles.container}>
        <div className={styles.introduction} data-landing-reveal>
          <div>
            <p className="eyebrow">{dict.eyebrow}</p>
            <h2 id="commerce-heading" className={styles.heading}>
              {dict.heading}
            </h2>
          </div>
          <p className={`${styles.description} text-muted`}>
            {dict.description}
          </p>
        </div>

        <SolutionShowcase
          slides={slides}
          problemLabel={dict.problemLabel}
          slidesLabel={slidesLabel}
        />
      </div>
    </section>
  );
}

export function ParticipantsSection({ dict }: { dict: ParticipantsDict }) {
  return (
    <section
      id="participantes"
      aria-labelledby="participants-heading"
      className={styles.participants}
    >
      <div className={styles.container}>
        <div className={styles.participantsIntroduction} data-landing-reveal>
          <p className="eyebrow">{dict.eyebrow}</p>
          <h2 id="participants-heading" className={styles.heading}>
            {dict.heading}
          </h2>
        </div>

        <div className={styles.participantsGrid}>
          <article className={styles.participantCard} data-landing-reveal>
            <ProducerStructureWidget dict={dict.producer.widget} />
            <p className={`eyebrow ${styles.participantLabel}`}>
              {dict.producer.label}
            </p>
            <h3>{dict.producer.title}</h3>
            <ul className={styles.participantList}>
              {dict.producer.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article
            className={styles.participantCard}
            data-landing-reveal
            data-landing-delay="50"
          >
            <BuyerReviewWidget dict={dict.buyer.widget} />
            <p className={`eyebrow ${styles.participantLabel}`}>
              {dict.buyer.label}
            </p>
            <h3>{dict.buyer.title}</h3>
            <ul className={styles.participantList}>
              {dict.buyer.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
