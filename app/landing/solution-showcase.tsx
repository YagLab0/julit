"use client";

import { useState, type ReactNode } from "react";
import styles from "./commerce.module.css";

type ShowcaseSlide = {
  tab: string;
  title: string;
  problem: string;
  solution: string;
  icon: ReactNode;
  mock: ReactNode;
};

export function SolutionShowcase({ slides }: { slides: ShowcaseSlide[] }) {
  const [active, setActive] = useState(0);
  const slide = slides[active];

  function onKeyDown(event: React.KeyboardEvent) {
    const forward =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;
    if (!forward) return;
    event.preventDefault();
    const next = (active + forward + slides.length) % slides.length;
    setActive(next);
    document.getElementById(`solucion-tab-${next}`)?.focus();
  }

  return (
    <div className={styles.showcase} data-landing-reveal>
      <div className={styles.notch}>
        <div
          className={styles.tabCol}
          role="tablist"
          aria-label="Propuestas JuLit"
          onKeyDown={onKeyDown}
        >
          {slides.map((item, index) => (
            <button
              key={item.tab}
              type="button"
              role="tab"
              id={`solucion-tab-${index}`}
              aria-selected={index === active}
              aria-controls="solucion-panel"
              className={styles.tab}
              onClick={() => setActive(index)}
            >
              {item.icon}
              {item.tab}
            </button>
          ))}
        </div>
        <div
          className={styles.tabCaption}
          role="tabpanel"
          id="solucion-panel"
          aria-labelledby={`solucion-tab-${active}`}
        >
          <span className={styles.captionProblem}>
            El problema — {slide.problem}
          </span>
          <p>
            <strong>{slide.title}.</strong> {slide.solution}
          </p>
        </div>
      </div>
      <div className={styles.panel} aria-hidden="true">
        <div className={styles.panelBg} />
        <div className={styles.mockLayer} key={active}>
          {slide.mock}
        </div>
      </div>
    </div>
  );
}
