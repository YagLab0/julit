import Link from "next/link";
import { HeroFlow } from "./hero-flow";
import { CommerceSection, ParticipantsSection } from "./commerce";
import { FaqSection, PassportSection } from "./passport-faq";
import { LifecycleCards } from "./lifecycle-cards";
import { TeamSection } from "./team";
import { LandingMotion } from "./landing-motion";
import { LangSwitch } from "./lang-switch";
import type { LandingDict, LandingLocale } from "./i18n";
import styles from "./landing.module.css";

function BrandMark() {
  return (
    <svg viewBox="0 0 32 36" fill="none" aria-hidden="true">
      <path d="M16 1 31 9.5v17L16 35 1 26.5v-17Z" fill="currentColor" />
      <path
        d="M21 10v10a5 5 0 0 1-10 0"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
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

function DemoLink({ label }: { label: string }) {
  return (
    <Link
      href="/explorer"
      prefetch={false}
      className="btn-primary"
      data-landing-press
    >
      {label} <ArrowIcon />
    </Link>
  );
}

function SectionLinks({ dict }: { dict: LandingDict }) {
  return (
    <>
      <a href="#solucion">{dict.nav.solution}</a>
      <a href="#como-funciona">{dict.nav.howItWorks}</a>
      <a href="#pasaporte">{dict.nav.passport}</a>
      <a href="#preguntas-frecuentes">{dict.nav.faq}</a>
      <a href="#equipo" className={styles.teamLink}>
        {dict.nav.team}
      </a>
    </>
  );
}

export function LandingPage({
  dict,
  locale,
}: {
  dict: LandingDict;
  locale: LandingLocale;
}) {
  return (
    <div id="landing" className={styles.landing} data-landing-motion>
      <LandingMotion />
      <a href="#contenido" className={styles.skipLink}>
        {dict.a11y.skipLink}
      </a>
      <main id="contenido">
        <section
          id="inicio"
          className={styles.hero}
          aria-labelledby="hero-title"
        >
          <div className={styles.heroBackdrop} aria-hidden="true" />
          <header className={styles.header}>
            <a
              href="#inicio"
              className={styles.brand}
              aria-label={dict.a11y.brandHome}
            >
              <BrandMark />
              JuLit
            </a>
            <nav className={styles.navigation} aria-label={dict.a11y.mainNav}>
              <SectionLinks dict={dict} />
            </nav>
            <div className={styles.headerActions}>
              <LangSwitch locale={locale} label={dict.a11y.langSwitch} />
              <Link href="/sign-in" prefetch={false} className={styles.login}>
                {dict.actions.signIn}
              </Link>
              <DemoLink label={dict.actions.exploreDemo} />
            </div>
          </header>
          <div className={styles.heroContent} data-landing-reveal>
            <h1 id="hero-title">{dict.hero.title}</h1>
            <p className={styles.heroDescription}>{dict.hero.description}</p>
            <div className={styles.heroActions}>
              <DemoLink label={dict.actions.exploreDemo} />
              <a
                href="#como-funciona"
                className="btn-secondary"
                data-landing-press
              >
                {dict.actions.howItWorks} <ArrowIcon />
              </a>
            </div>
            <p className={styles.heroLocation}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <circle
                  cx="12"
                  cy="10"
                  r="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              {dict.hero.location}
            </p>
          </div>
          <HeroFlow dict={dict.heroFlow} />
        </section>
        <aside className={styles.demoNotice} aria-label={dict.a11y.demoNotice}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M12 11v6m0-10v1" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <p>{dict.notice}</p>
        </aside>
        <CommerceSection
          dict={dict.commerce}
          slidesLabel={dict.a11y.slidesLabel}
        />

        <section
          id="como-funciona"
          className={styles.process}
          aria-labelledby="process-title"
        >
          <div className={styles.processIntro} data-landing-reveal>
            <div>
              <p className="eyebrow mb-5">{dict.process.eyebrow}</p>
              <h2 id="process-title" className={styles.sectionHeading}>
                {dict.process.heading}
              </h2>
            </div>
            <p className={styles.sectionDescription}>
              {dict.process.description}
              <span className={styles.processCaption}>
                {dict.process.caption}
              </span>
            </p>
          </div>
          <LifecycleCards dict={dict.process} />
        </section>
        <PassportSection dict={dict.passport} />
        <ParticipantsSection dict={dict.participants} />
        <FaqSection dict={dict.faq} />
        <TeamSection dict={dict.team} a11y={dict.a11y} />

        <section
          id="cierre"
          className={styles.close}
          aria-labelledby="close-title"
        >
          <div className={styles.closeInner}>
            <div className={styles.closeIntro} data-landing-reveal>
              <div>
                <p className="eyebrow">{dict.close.eyebrow}</p>
                <h2 id="close-title">{dict.close.heading}</h2>
              </div>
              <div>
                <p className={styles.closeDescription}>
                  {dict.close.description}
                </p>
                <div className={styles.closeAction}>
                  <DemoLink label={dict.actions.exploreDemo} />
                </div>
              </div>
            </div>
            <footer className={styles.footer}>
              <div className={styles.footerTop}>
                <a
                  href="#inicio"
                  className={styles.brand}
                  aria-label={dict.a11y.brandHome}
                >
                  <BrandMark />
                  JuLit
                </a>
                <nav
                  className={styles.navigation}
                  aria-label={dict.a11y.footerNav}
                >
                  <SectionLinks dict={dict} />
                </nav>
              </div>
              <p className={styles.signature}>{dict.footer.signature}</p>
              <p className={styles.credit}>
                {dict.footer.creditPhoto}{" "}
                <a href="https://commons.wikimedia.org/wiki/File:Salinas_Grandes_(Jujuy_and_Salta)_01.jpg">
                  Bernard Gagnon / Wikimedia Commons
                </a>{" "}
                ·{" "}
                <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es">
                  CC BY-SA 4.0
                </a>
                . {dict.footer.creditNote}
              </p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
