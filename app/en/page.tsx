import type { Metadata } from "next";
import { LandingPage } from "../landing/landing-page";
import { HtmlLang } from "../landing/html-lang";
import { en } from "../landing/i18n/en";

export const metadata: Metadata = {
  title: en.meta.title,
  description: en.meta.description,
  alternates: { canonical: "/en", languages: { es: "/", en: "/en" } },
};

export default function HomeEn() {
  return (
    <>
      <HtmlLang lang="en" />
      <LandingPage dict={en} locale="en" />
    </>
  );
}
