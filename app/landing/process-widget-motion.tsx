"use client";

import { useEffect, useRef, type ReactNode } from "react";
function bezier(t: number, p1: number, p2: number) {
  const mt = 1 - t;
  return 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t;
}

function timeForLineProgress(progress: number) {
  let low = 0;
  let high = 1;
  for (let step = 0; step < 20; step += 1) {
    const time = (low + high) / 2;
    let tLow = 0;
    let tHigh = 1;
    for (let inner = 0; inner < 16; inner += 1) {
      const t = (tLow + tHigh) / 2;
      if (bezier(t, 0.45, 0.55) < time) tLow = t;
      else tHigh = t;
    }
    const eased = bezier((tLow + tHigh) / 2, 0, 1);
    if (eased < progress) low = time;
    else high = time;
  }
  return (low + high) / 2;
}

export function ProcessWidgetMotion({
  children,
  className,
  decorative = false,
  continuous = false,
}: {
  children: ReactNode;
  className: string;
  decorative?: boolean;
  continuous?: boolean;
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
      if (reduced.matches || (keyboard && !continuous)) {
        for (const animation of animations) animation.cancel();
        return;
      }
      const active = intersecting && !document.hidden;
      for (const animation of animations) {
        if (active) animation.play();
        else animation.pause();
      }
    }
    function mount() {
      if (!root) return;
      for (const animation of animations) animation.cancel();
      animations.length = 0;
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
      root
        .querySelectorAll("path[data-process-draw]")
        .forEach((piece, index) => {
          const path = piece as SVGPathElement;
          const length = path.getTotalLength();
          const dash = Math.max(16, length * 0.28);
          const animation = path.animate(
            [
              {
                strokeDasharray: `${dash} ${length}`,
                strokeDashoffset: dash,
              },
              {
                strokeDasharray: `${dash} ${length}`,
                strokeDashoffset: -length,
              },
            ],
            {
              duration: 2400,
              delay: index * -1200,
              iterations: Infinity,
              easing: "linear",
            }
          );
          animation.pause();
          animations.push(animation);
        });
      root
        .querySelectorAll<HTMLElement>("[data-process-fill]")
        .forEach((piece) => {
          const timing = {
            duration: 2600,
            iterations: Infinity,
            direction: "alternate" as const,
            easing: "cubic-bezier(0.45, 0, 0.55, 1)",
          };
          const line = piece.animate(
            [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }],
            timing
          );
          line.pause();
          animations.push(line);

          const host = piece.offsetParent;
          const lineTop = piece.offsetTop;
          const lineHeight = piece.offsetHeight;
          piece.parentElement
            ?.querySelectorAll<HTMLElement>("[data-process-node]")
            .forEach((node) => {
              let top = 0;
              let current: HTMLElement | null = node;
              while (current && current !== host) {
                top += current.offsetTop;
                current = current.offsetParent as HTMLElement | null;
              }
              const fraction =
                lineHeight > 0
                  ? (top + node.offsetHeight / 2 - lineTop) / lineHeight
                  : 0;
              const at = timeForLineProgress(
                Math.min(0.98, Math.max(0.02, fraction))
              );
              const paint =
                node.querySelector<HTMLElement>("[data-process-paint]") ?? node;
              const animation = paint.animate(
                [
                  { opacity: 0, transform: "scale(0.7)", offset: 0 },
                  {
                    opacity: 0,
                    transform: "scale(0.7)",
                    offset: Math.max(0, at - 0.02),
                  },
                  {
                    opacity: 1,
                    transform: "scale(1)",
                    offset: Math.min(1, at + 0.02),
                  },
                  { opacity: 1, transform: "scale(1)", offset: 1 },
                ],
                timing
              );
              animation.pause();
              animations.push(animation);
            });
        });
      root
        .querySelectorAll<HTMLElement>("[data-process-retreat]")
        .forEach((piece) => {
          const animation = piece.animate(
            [{ height: "0px" }, { height: "14px" }],
            {
              duration: 1800,
              iterations: Infinity,
              direction: "alternate",
              easing: "cubic-bezier(0.45, 0, 0.55, 1)",
            }
          );
          animation.pause();
          animations.push(animation);
        });
    }
    function onKeyboard() {
      keyboard = true;
      update();
    }
    function onPointer() {
      keyboard = false;
      update();
    }
    function remount() {
      mount();
      update();
    }
    const layout = window.matchMedia("(max-width: 640px)");
    const observer = new IntersectionObserver(
      (entries) => {
        intersecting = entries[0].isIntersecting;
        update();
      },
      { threshold: 0.15 }
    );
    mount();
    observer.observe(root);
    update();
    reduced.addEventListener("change", update);
    layout.addEventListener("change", remount);
    document.addEventListener("keydown", onKeyboard);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      for (const animation of animations) animation.cancel();
      reduced.removeEventListener("change", update);
      layout.removeEventListener("change", remount);
      document.removeEventListener("keydown", onKeyboard);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [continuous]);

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
