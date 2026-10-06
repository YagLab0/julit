"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { LOT_COLUMNS, type Lot } from "./lots";

export type OriginLotsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; lots: Lot[] };

/**
 * Public lot index for one origin, newest first. Fetched when the fiche or
 * list section mounts, so reopening a mine reflects the current index state.
 */
export function useOriginLots(originId: string): {
  state: OriginLotsState;
  retry: () => void;
} {
  const [state, setState] = useState<OriginLotsState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    createClient()
      .from("lots")
      .select(LOT_COLUMNS)
      .eq("origin_id", originId)
      .order("indexed_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Could not load the lot index", error);
          setState({ status: "error" });
          return;
        }
        setState({ status: "ready", lots: (data ?? []) as Lot[] });
      });
    return () => {
      active = false;
    };
  }, [originId, reloadKey]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setReloadKey((n) => n + 1);
  }, []);

  return { state, retry };
}
