"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Persist a value in localStorage. Reads happen after mount so server and first
 * client render agree; `ready` tells callers when the stored value has landed.
 * Every access is guarded — private browsing and blocked site data both throw.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // No stored value available — carry on with the initial one.
    }
    setReady(true);
  }, [key]);

  const save = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage is unavailable or full; the value still applies this session.
      }
    },
    [key],
  );

  return { value, save, ready } as const;
}
