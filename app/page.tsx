import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CommerceSection, ParticipantsSection } from "./landing/commerce";
import { FaqSection, PassportSection } from "./landing/passport-faq";
import { TeamSection } from "./landing/team";
import { LandingMotion } from "./landing/landing-motion";
import styles from "./landing/landing.module.css";

export const metadata: Metadata = {
  title: "JuLit | Del salar al mercado, con liquidación atómica",
  description:
    "Conocé JuLit: directorio B2B y liquidación atómica de lotes de carbonato de litio sobre Solana. Desde Jujuy hacia la cadena global del litio.",
};

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
      href="/explorer"
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
      <a href="#equipo" className={styles.teamLink}>
        Equipo
      </a>
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
              Litio de Jujuy. Proyección global
            </p>
            <h1 id="hero-title">
              Del salar al mercado, con liquidación atómica.
            </h1>
            <p className={styles.heroDescription}>
              JuLit conecta productores y compradores de carbonato de litio.
              Cada lote nace con un título digital, y el pago se liquida en la
              misma transacción en que el título cambia de manos, sobre Solana.
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
            La demo corre en Solana Devnet con tokens de prueba: las
            transacciones son reales, el valor no.
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
              <p className="eyebrow mb-5">El ciclo de vida de un lote</p>
              <h2 id="process-title" className={styles.sectionHeading}>
                Cinco pasos, tres de ellos en la cadena.
              </h2>
            </div>
            <p className={styles.sectionDescription}>
              Así se mueve un lote por JuLit.
              <span className={styles.processCaption}>
                Los pasos de tokenización, liquidación y redención ocurren en la
                cadena; el descubrimiento y la entrega física quedan fuera del
                protocolo.
              </span>
            </p>
          </div>
          <ol className={styles.steps}>
            {lifecycleSteps.map((step, index) => (
              <li
                key={step.number}
                className={`${styles.step} ${step.onchain ? styles.stepOnchain : ""}`}
                data-landing-reveal
                data-landing-delay={index * 50}
              >
                <div className={styles.stepHead}>
                  <span className={styles.stepNumber} aria-hidden="true">
                    {step.number}
                  </span>
                  <span className={styles.stepTag}>
                    {step.onchain ? "En la cadena" : "Fuera de la cadena"}
                  </span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>
        <PassportSection />
        <ParticipantsSection />
        <FaqSection />
        <TeamSection />

        <section
          id="cierre"
          className={styles.close}
          aria-labelledby="close-title"
        >
          <div className={styles.closeInner}>
            <div className={styles.closeIntro} data-landing-reveal>
              <div>
                <p className="eyebrow">Litio de Jujuy. Proyección global.</p>
                <h2 id="close-title">
                  Del salar al mercado, con liquidación atómica.
                </h2>
              </div>
              <div>
                <p className={styles.closeDescription}>
                  Un directorio B2B y un protocolo de entrega contra pago para
                  el carbonato de litio, construido sobre Solana.
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
                JuLit · Directorio B2B y liquidación atómica de lotes de
                carbonato de litio sobre Solana.
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
