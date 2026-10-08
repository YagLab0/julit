"use client";

import { useRouter } from "next/navigation";
import { LOCALES, writeLocaleCookie, type Locale } from "../../lib/locale";

/** Segmented ES | EN control: writes the locale cookie and re-renders the
 *  account tree. Self-contained so it also works outside the account
 *  provider (sign-in, onboarding shell). */
export function LocaleSwitch({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const router = useRouter();

  const pick = (next: Locale) => {
    if (next === locale) return;
    writeLocaleCookie(next);
    router.refresh();
  };

  return (
    <div
      role="group"
      aria-label="Idioma / Language"
      className={`inline-flex items-center rounded-full border border-border-low bg-background p-0.5 ${className ?? ""}`}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => pick(l)}
          aria-pressed={l === locale}
          className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
            l === locale
              ? "bg-foreground text-background"
              : "text-muted hover:text-foreground"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
