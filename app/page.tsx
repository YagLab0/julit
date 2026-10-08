import type { Metadata } from "next";
import { LandingPage } from "./landing/landing-page";
import { es } from "./landing/i18n/es";

export const metadata: Metadata = {
  title: es.meta.title,
  description: es.meta.description,
  alternates: { languages: { es: "/", en: "/en" } },
};

export default function Home() {
  return <LandingPage dict={es} locale="es" />;
}
