import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CommerceSection, ParticipantsSection } from "./landing/commerce";
import { FaqSection, PassportSection } from "./landing/passport-faq";
import { LandingMotion } from "./landing/landing-motion";
import { ProcessWidget } from "./landing/process-widgets";
import styles from "./landing/landing.module.css";

export const metadata: Metadata = {
  title: "JuLit | Del salar al mercado, con evidencia verificable",
  description:
    "Conocé JuLit: pasaportes digitales para lotes de carbonato de litio y una propuesta de liquidación B2B sobre Solana. Desde Jujuy hacia la cadena global del litio.",
};

const processSteps = [
  {
    number: "01",
    title: "El productor registra",
    description:
      "Declara el origen, la cantidad y la pureza química del carbonato de litio. Asocia un auditor y define si el lote se ofrece al mercado o se reserva para un comprador.",
  },
  {
    number: "02",
    title: "El auditor aporta evidencia",
    description:
      "Evalúa los datos químicos y ambientales y adjunta su informe. La referencia de integridad permite comprobar si el documento coincide con la versión registrada.",
  },
  {
    number: "03",
    title: "El comprador revisa y decide",
    description:
      "Consulta el origen, las condiciones y la evidencia del lote. La propuesta incorpora liquidación en USDC sobre Solana; la demo no realiza transferencias de fondos.",
  },
];

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

function DemoLink() {
  return (
    <Link
      href="/batches"
      prefetch={false}
      className="btn-primary"
      data-landing-press
    >
      Explorar demo <ArrowIcon />
    </Link>
  );
}

function SectionLinks() {
  return (
    <>
      <a href="#solucion">Solución</a>
      <a href="#como-funciona">Cómo funciona</a>
      <a href="#pasaporte">Pasaporte</a>
      <a href="#preguntas-frecuentes">Preguntas frecuentes</a>
    </>
  );
}

export default function Home() {
  return (
    <div id="landing" className={styles.landing}>
      <LandingMotion />
      <a href="#contenido" className={styles.skipLink}>
        Saltar al contenido
      </a>
      <header className={styles.header}>
        <a href="#inicio" className={styles.brand} aria-label="JuLit, inicio">
          <BrandMark />
          JuLit
        </a>
        <nav className={styles.navigation} aria-label="Navegación principal">
          <SectionLinks />
        </nav>
        <div className={styles.headerActions}>
          <Link href="/sign-in" prefetch={false} className={styles.login}>
            Ingresar
          </Link>
          <DemoLink />
        </div>
      </header>

      <main id="contenido">
        <section
          id="inicio"
          className={styles.hero}
          aria-labelledby="hero-title"
        >
          <Image
            src="/landing/salinas-grandes.jpg"
            alt="Paisaje de las Salinas Grandes, entre Jujuy y Salta, Argentina."
            fill
            preload
            sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1399px) calc(100vw - 64px), 1360px"
            className={styles.heroImage}
          />
          <div className={styles.heroContent} data-landing-reveal>
            <p className={styles.heroEyebrow}>
              Litio de Jujuy. Proyección global.
            </p>
            <h1 id="hero-title">
              Del salar al mercado, con evidencia verificable.
            </h1>
            <p className={styles.heroDescription}>
              JuLit conecta productores, auditores y compradores de carbonato de
              litio con un pasaporte digital por lote y una propuesta de
              liquidación B2B sobre Solana.
            </p>
            <div className={styles.heroActions}>
              <DemoLink />
              <a
                href="#como-funciona"
                className="btn-secondary"
                data-landing-press
              >
                Cómo funciona <ArrowIcon />
              </a>
            </div>
          </div>
          <p className={styles.heroCaption}>
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
            Salinas Grandes · Jujuy y Salta, Argentina
          </p>
        </section>
        <aside className={styles.demoNotice} aria-label="Alcance de la demo">
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
          <p>
            Explorá el mapa de orígenes de la demo. La liquidación es simulada:
            no transfiere USDC ni representa operaciones comerciales reales.
          </p>
        </aside>
        <CommerceSection />

        <section
          id="como-funciona"
          className={styles.process}
          aria-labelledby="process-title"
        >
          <div className={styles.processIntro} data-landing-reveal>
            <div>
              <p className="eyebrow mb-5">Tres actores. Un mismo lote.</p>
              <h2 id="process-title" className={styles.sectionHeading}>
                Del registro a la decisión de compra.
              </h2>
            </div>
            <p className={styles.sectionDescription}>
              Así se organiza el flujo propuesto por JuLit.
              <span className={styles.processCaption}>
                Representación ilustrativa del proceso.
              </span>
            </p>
          </div>
          <ol className={styles.steps}>
            {processSteps.map((step, index) => (
              <li
                key={step.number}
                className={styles.step}
                data-landing-reveal
                data-landing-delay={index * 50}
              >
                <ProcessWidget stage={index} />
                <span className={styles.stepNumber} aria-hidden="true">
                  {step.number}
                </span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>
        <PassportSection />
        <ParticipantsSection />
        <FaqSection />

        <section className={styles.close} aria-labelledby="close-title">
          <div className={styles.closeInner}>
            <div className={styles.closeIntro} data-landing-reveal>
              <div>
                <p className="eyebrow">
                  Desde Jujuy hacia la cadena global del litio
                </p>
                <h2 id="close-title">El próximo paso empieza con evidencia.</h2>
              </div>
              <div>
                <p className={styles.closeDescription}>
                  Conocé la propuesta de JuLit y explorá los orígenes de la
                  demo.
                </p>
                <div className={styles.closeAction}>
                  <DemoLink />
                </div>
              </div>
            </div>
            <footer className={styles.footer}>
              <div className={styles.footerTop}>
                <a
                  href="#inicio"
                  className={styles.brand}
                  aria-label="JuLit, inicio"
                >
                  <BrandMark />
                  JuLit
                </a>
                <nav
                  className={styles.navigation}
                  aria-label="Navegación del pie"
                >
                  <SectionLinks />
                </nav>
              </div>
              <p className={styles.signature}>
                JuLit · Pasaportes digitales de lote y una propuesta de
                liquidación B2B sobre Solana.
              </p>
              <p className={styles.credit}>
                Fotografía:{" "}
                <a href="https://commons.wikimedia.org/wiki/File:Salinas_Grandes_(Jujuy_and_Salta)_01.jpg">
                  Bernard Gagnon / Wikimedia Commons
                </a>{" "}
                ·{" "}
                <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es">
                  CC BY-SA 4.0
                </a>
                . Imagen redimensionada, recomprimida y recortada en la
                composición.
              </p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
