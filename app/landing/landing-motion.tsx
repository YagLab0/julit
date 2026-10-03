"use client";

import { useEffect } from "react";

export function LandingMotion() {
  useEffect(() => {
    const root = document.getElementById("landing");
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    let pressed: HTMLElement | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          observer.unobserve(element);
          if (element.dataset.landingRevealed) continue;
          element.dataset.landingRevealed = "true";
          if (reducedMotion.matches) continue;

          const animation = element.animate(
            [
              { opacity: 0, transform: "translateY(8px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            {
              duration: 240,
              delay: Number(element.dataset.landingDelay ?? 0),
              easing: "cubic-bezier(0.23, 1, 0.32, 1)",
            }
          );
          animations.add(animation);
          animation.finished.then(
            () => animations.delete(animation),
            () => animations.delete(animation)
          );
        }
      },
      { threshold: 0.12 }
    );
    root.querySelectorAll("[data-landing-reveal]").forEach((element) => {
      observer.observe(element);
    });

    function release() {
      pressed?.removeAttribute("data-landing-pressed");
      pressed = null;
    }

    function press(event: PointerEvent) {
      if (event.button !== 0 || reducedMotion.matches) return;
      const target = (event.target as Element).closest<HTMLElement>(
        "[data-landing-press]"
      );
      if (!target || !root?.contains(target)) return;
      release();
      pressed = target;
      target.setAttribute("data-landing-pressed", "");
    }

    function stopMotion() {
      release();
      for (const animation of animations) animation.cancel();
      animations.clear();
    }

    function stopKeyboardMotion() {
      observer.disconnect();
      stopMotion();
    }

    root.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
    root.addEventListener("keydown", stopKeyboardMotion);
    reducedMotion.addEventListener("change", stopMotion);

    return () => {
      observer.disconnect();
      stopMotion();
      root.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
      root.removeEventListener("keydown", stopKeyboardMotion);
      reducedMotion.removeEventListener("change", stopMotion);
    };
  }, []);

  return null;
}
