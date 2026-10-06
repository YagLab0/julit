"use client";

import { useRef, type ReactNode } from "react";
import styles from "./commerce.module.css";

function ArrowIcon({ flip }: { flip?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
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

export function SolutionCarousel({ children }: { children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function move(direction: 1 | -1) {
    const track = trackRef.current;
    const slide = track?.firstElementChild as HTMLElement | null;
    if (!track || !slide) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({
      left: direction * (slide.offsetWidth + gap),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  return (
    <div
      className={styles.carousel}
      role="region"
      aria-roledescription="carousel"
      aria-label="Propuestas JuLit"
    >
      <div className={styles.carouselBar}>
        <button
          type="button"
          className={styles.carouselButton}
          onClick={() => move(-1)}
        >
          <ArrowIcon flip />
          <span className={styles.visuallyHidden}>Diapositiva anterior</span>
        </button>
        <button
          type="button"
          className={styles.carouselButton}
          onClick={() => move(1)}
        >
          <ArrowIcon />
          <span className={styles.visuallyHidden}>Diapositiva siguiente</span>
        </button>
      </div>
      <div ref={trackRef} className={styles.track} tabIndex={0}>
        {children}
      </div>
    </div>
  );
}
