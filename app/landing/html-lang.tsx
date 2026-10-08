"use client";

import { useEffect } from "react";

/** The root layout renders `<html lang="es-AR">`; locale routes fix the
 *  attribute on mount since only the root layout owns the element. */
export function HtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.lang;
    root.lang = lang;
    return () => {
      root.lang = previous;
    };
  }, [lang]);
  return null;
}
