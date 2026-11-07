import { useMemo, useSyncExternalStore } from "react";
import { getCompareSnapshot, subscribeCompare } from "../api/compare";

// The phones chosen for comparison, updated everywhere as soon as the list changes.
export function useCompareList() {
  const snapshot = useSyncExternalStore(subscribeCompare, getCompareSnapshot);

  return useMemo(() => {
    try {
      return JSON.parse(snapshot);
    } catch {
      return [];
    }
  }, [snapshot]);
}
