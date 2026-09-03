"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EMPTY_STATE,
  mergeState,
  migrateLegacy,
  parseState,
  sameState,
  type TripState,
} from "./syncState";
import {
  STORAGE_KEY,
  STORAGE_KEY_CUSTOM,
  STORAGE_KEY_PASSPHRASE,
  STORAGE_KEY_STATE,
} from "./constants";

export type SyncStatus =
  | "off" // no passphrase entered on this device
  | "syncing"
  | "synced"
  | "offline" // network or store unreachable; local edits still apply
  | "bad-key"
  | "unconfigured"; // the deployment has no store attached yet

const PUSH_DEBOUNCE_MS = 800;
const POLL_MS = 12_000;

function readLocal(): TripState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_STATE);
    if (raw) return parseState(JSON.parse(raw));
  } catch {
    // Fall through to the legacy read below.
  }
  // First run since sync landed: carry over whatever was already ticked.
  try {
    const done = window.localStorage.getItem(STORAGE_KEY);
    const custom = window.localStorage.getItem(STORAGE_KEY_CUSTOM);
    if (done || custom) {
      return migrateLegacy(
        done ? JSON.parse(done) : null,
        custom ? JSON.parse(custom) : null,
      );
    }
  } catch {
    // No usable stored value; start empty.
  }
  return EMPTY_STATE;
}

function writeLocal(state: TripState) {
  try {
    window.localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
  } catch {
    // Storage unavailable (private window, blocked site data). The value still
    // applies for this session.
  }
}

export function useTripState() {
  const [state, setState] = useState<TripState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [passphrase, setPassphrase] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>("off");
  const [lastSync, setLastSync] = useState<number | null>(null);

  // Refs mirror state so the sync loop reads current values without being
  // torn down and rebuilt on every tick.
  const stateRef = useRef(state);
  const keyRef = useRef(passphrase);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = useCallback((next: TripState) => {
    stateRef.current = next;
    setState(next);
    writeLocal(next);
  }, []);

  useEffect(() => {
    const local = readLocal();
    stateRef.current = local;
    setState(local);
    try {
      const key = window.localStorage.getItem(STORAGE_KEY_PASSPHRASE);
      if (key) {
        keyRef.current = key;
        setPassphrase(key);
        setStatus("syncing");
      }
    } catch {
      // No stored passphrase; stays local-only until one is entered.
    }
    setReady(true);
  }, []);

  const sync = useCallback(async () => {
    const key = keyRef.current;
    if (!key) return;

    // Claim the pending edits up front; a tick mid-flight re-dirties the ref
    // and gets picked up by the next run rather than being swallowed.
    const pushing = dirtyRef.current;
    if (pushing) dirtyRef.current = false;

    setStatus("syncing");
    try {
      const res = await fetch("/api/checklist", {
        method: pushing ? "POST" : "GET",
        headers: {
          "x-trip-key": key,
          ...(pushing ? { "content-type": "application/json" } : {}),
        },
        body: pushing ? JSON.stringify({ state: stateRef.current }) : undefined,
      });

      if (res.status === 401) {
        if (pushing) dirtyRef.current = true;
        setStatus("bad-key");
        return;
      }
      if (res.status === 503) {
        if (pushing) dirtyRef.current = true;
        setStatus("unconfigured");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));

      const body = (await res.json()) as { state?: unknown };
      const merged = mergeState(stateRef.current, parseState(body.state));
      if (!sameState(merged, stateRef.current)) apply(merged);

      setStatus("synced");
      setLastSync(Date.now());
    } catch {
      if (pushing) dirtyRef.current = true;
      setStatus("offline");
    }
  }, [apply]);

  /** Local edit: applies instantly, then pushes once the tapping stops. */
  const update = useCallback(
    (change: (current: TripState) => TripState) => {
      apply(change(stateRef.current));
      dirtyRef.current = true;
      if (!keyRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void sync(), PUSH_DEBOUNCE_MS);
    },
    [apply, sync],
  );

  const connect = useCallback(
    (key: string) => {
      const trimmed = key.trim();
      if (!trimmed) return;
      keyRef.current = trimmed;
      setPassphrase(trimmed);
      try {
        window.localStorage.setItem(STORAGE_KEY_PASSPHRASE, trimmed);
      } catch {
        // Not persisting the passphrase just means re-entering it next visit.
      }
      // Push on connect so this device's existing ticks reach the shared list.
      dirtyRef.current = true;
      void sync();
    },
    [sync],
  );

  const disconnect = useCallback(() => {
    keyRef.current = null;
    setPassphrase(null);
    setStatus("off");
    try {
      window.localStorage.removeItem(STORAGE_KEY_PASSPHRASE);
    } catch {
      // Nothing to clean up.
    }
  }, []);

  // Poll while the tab is in front, and catch up the moment signal returns.
  useEffect(() => {
    if (!ready || !passphrase) return;

    void sync();
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) void sync();
    }, POLL_MS);

    const onWake = () => {
      if (document.visibilityState === "visible") void sync();
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("online", onWake);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("online", onWake);
    };
  }, [ready, passphrase, sync]);

  return {
    state,
    ready,
    update,
    sync,
    status: (passphrase ? status : "off") as SyncStatus,
    lastSync,
    connect,
    disconnect,
  } as const;
}
