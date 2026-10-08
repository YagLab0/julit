"use client";

import Link from "next/link";
import { writeLocaleCookie, type Locale } from "../lib/locale";
import styles from "./landing.module.css";

/** ES | EN links for the landing; also writes the locale cookie so the
 *  authenticated account picks up the same language. */
export function LangSwitch({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const write = (l: Locale) => () => writeLocaleCookie(l);

  return (
    <nav className={styles.langSwitch} aria-label={label}>
      <Link
        href="/"
        onClick={write("es")}
        aria-current={locale === "es" ? "page" : undefined}
      >
        ES
      </Link>
      <Link
        href="/en"
        onClick={write("en")}
        aria-current={locale === "en" ? "page" : undefined}
      >
        EN
      </Link>
    </nav>
  );
}
