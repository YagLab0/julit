"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ProcessWidgetMotion({
  children,
  className,
  decorative = false,
}: {
  children: ReactNode;
  className: string;
  decorative?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations: Animation[] = [];
    let intersecting = false;
    let keyboard = false;

    function update() {
      if (reduced.matches || keyboard) {
        for (const animation of animations) animation.cancel();
        return;
      }
      const active = intersecting && !document.hidden;
      for (const animation of animations) {
        if (active) animation.play();
        else animation.pause();
      }
    }
    root
      .querySelectorAll<HTMLElement>("[data-process-write]")
      .forEach((piece, index) => {
        const start = 0.06 + index * 0.09;
        const animation = piece.animate(
          [
            { clipPath: "inset(0 100% 0 0)", opacity: 0.4, offset: 0 },
            { clipPath: "inset(0 100% 0 0)", opacity: 1, offset: start },
            { clipPath: "inset(0 0% 0 0)", opacity: 1, offset: start + 0.15 },
            { clipPath: "inset(0 0% 0 0)", opacity: 1, offset: 0.86 },
            { clipPath: "inset(0 0% 0 0)", opacity: 0, offset: 0.96 },
            { clipPath: "inset(0 100% 0 0)", opacity: 0, offset: 1 },
          ],
          { duration: 5600, iterations: Infinity, easing: "linear" }
        );
        animation.pause();
        animations.push(animation);
      });
    root
      .querySelectorAll<HTMLElement>("[data-process-float]")
      .forEach((piece, index) => {
        const animation = piece.animate(
          [
            { transform: "translateY(3px) rotate(-0.6deg)" },
            { transform: "translateY(-5px) rotate(0.6deg)" },
            { transform: "translateY(3px) rotate(-0.6deg)" },
          ],
          {
            duration: 5200,
            delay: index * -800,
            iterations: Infinity,
            easing: "cubic-bezier(0.45, 0, 0.55, 1)",
          }
        );
        animation.pause();
        animations.push(animation);
      });
    root
      .querySelectorAll<HTMLElement>("[data-process-focus]")
      .forEach((piece, index, pieces) => {
        const start = index / pieces.length;
        const end = (index + 1) / pieces.length;
        const animation = piece.animate(
          [
            { opacity: 0, offset: 0 },
            { opacity: 0, offset: start },
            { opacity: 1, offset: start + 0.025 },
            { opacity: 1, offset: end - 0.025 },
            { opacity: 0, offset: end },
            { opacity: 0, offset: 1 },
          ],
          { duration: 8400, iterations: Infinity, easing: "linear" }
        );
        animation.pause();
        animations.push(animation);
      });
    function onKeyboard() {
      keyboard = true;
      update();
    }
    function onPointer() {
      keyboard = false;
      update();
    }
    const observer = new IntersectionObserver(
      (entries) => {
        intersecting = entries[0].isIntersecting;
        update();
      },
      { threshold: 0.15 }
    );
    observer.observe(root);
    update();
    reduced.addEventListener("change", update);
    document.addEventListener("keydown", onKeyboard);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      for (const animation of animations) animation.cancel();
      reduced.removeEventListener("change", update);
      document.removeEventListener("keydown", onKeyboard);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      data-process-widget
      aria-hidden={decorative || undefined}
    >
      {children}
    </div>
  );
}
