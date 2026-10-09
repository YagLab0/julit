"use client";

import { useEffect, useState } from "react";

/**
 * Current time in unix seconds, ticking on an interval. Returns null on
 * the first render (and on the server) so countdowns and time-gated
 * actions settle after mount instead of rendering with a stale clock.
 */
export function useNowSecs(intervalMs = 30_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
