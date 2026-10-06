"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { BATCH_COLUMNS, type Batch } from "./batches";

export type OriginBatchesState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; batches: Batch[] };

/**
 * Public batch index for one origin, newest first. Fetched when the fiche or
 * list section mounts, so reopening a mine reflects the current index state.
 */
export function useOriginBatches(originId: string): {
  state: OriginBatchesState;
  retry: () => void;
} {
  const [state, setState] = useState<OriginBatchesState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    createClient()
      .from("batches")
      .select(BATCH_COLUMNS)
      .eq("origin_id", originId)
      .order("indexed_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Could not load the batch index", error);
          setState({ status: "error" });
          return;
        }
        setState({ status: "ready", batches: (data ?? []) as Batch[] });
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
