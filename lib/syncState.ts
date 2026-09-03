import type { Todo } from "./types";

/**
 * Shared checklist state.
 *
 * Every entry carries the timestamp of the edit that produced it, and merging
 * takes the newer side per key. That gives the behaviour two people actually
 * want on a trip: tick things independently, on separate phones, with no
 * signal, and nobody's work gets clobbered when both come back online. Ticking
 * the *same* item from both phones is the only case a decision is needed, and
 * there the later tap wins.
 */

export interface Stamped<T> {
  /** The value. `null` in `custom` is a tombstone for a deleted task. */
  v: T;
  /** Epoch ms of the edit. */
  at: number;
}

export interface TripState {
  done: Record<string, Stamped<boolean>>;
  custom: Record<string, Stamped<Todo | null>>;
}

export const EMPTY_STATE: TripState = { done: {}, custom: {} };

function mergeMaps<T>(
  a: Record<string, Stamped<T>>,
  b: Record<string, Stamped<T>>,
): Record<string, Stamped<T>> {
  const out: Record<string, Stamped<T>> = { ...a };
  for (const [key, entry] of Object.entries(b)) {
    const mine = out[key];
    // Ties keep the local side, so a merge with an identical remote is a no-op.
    if (!mine || entry.at > mine.at) out[key] = entry;
  }
  return out;
}

export function mergeState(local: TripState, remote: TripState): TripState {
  return {
    done: mergeMaps(local.done, remote.done),
    custom: mergeMaps(local.custom, remote.custom),
  };
}

/** True when the two states would render identically. */
export function sameState(a: TripState, b: TripState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ── Views the UI actually renders ────────────────────────────────

export function doneMap(state: TripState): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [id, entry] of Object.entries(state.done)) {
    if (entry.v) out[id] = true;
  }
  return out;
}

export function customList(state: TripState): Todo[] {
  return Object.values(state.custom)
    .map((entry) => entry.v)
    .filter((todo): todo is Todo => todo !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
}

// ── Edits ────────────────────────────────────────────────────────

export function setDone(
  state: TripState,
  id: string,
  value: boolean,
  now = Date.now(),
): TripState {
  return { ...state, done: { ...state.done, [id]: { v: value, at: now } } };
}

export function addCustom(state: TripState, todo: Todo, now = Date.now()): TripState {
  return { ...state, custom: { ...state.custom, [todo.id]: { v: todo, at: now } } };
}

/** Deletes leave a tombstone, so the removal survives a merge with a peer
 *  whose copy still has the task. */
export function removeCustom(state: TripState, id: string, now = Date.now()): TripState {
  const done = { ...state.done };
  delete done[id];
  return { ...state, done, custom: { ...state.custom, [id]: { v: null, at: now } } };
}

// ── Parsing and migration ────────────────────────────────────────

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Accepts anything and returns a state, so bad or truncated stored JSON can
 *  never take the checklist down. */
export function parseState(raw: unknown): TripState {
  if (!isObject(raw)) return EMPTY_STATE;

  const done: TripState["done"] = {};
  if (isObject(raw.done)) {
    for (const [id, entry] of Object.entries(raw.done)) {
      if (isObject(entry) && typeof entry.v === "boolean" && typeof entry.at === "number") {
        done[id] = { v: entry.v, at: entry.at };
      }
    }
  }

  const custom: TripState["custom"] = {};
  if (isObject(raw.custom)) {
    for (const [id, entry] of Object.entries(raw.custom)) {
      if (!isObject(entry) || typeof entry.at !== "number") continue;
      if (entry.v === null) custom[id] = { v: null, at: entry.at };
      else if (isObject(entry.v) && typeof entry.v.id === "string") {
        custom[id] = { v: entry.v as unknown as Todo, at: entry.at };
      }
    }
  }

  return { done, custom };
}

/**
 * Upgrades the pre-sync format — a flat `{id: true}` of ticks and a plain array
 * of custom tasks — so nobody loses the boxes they already ticked.
 * Stamped at time 0 so a genuine later edit on either side always wins.
 */
export function migrateLegacy(legacyDone: unknown, legacyCustom: unknown): TripState {
  const state: TripState = { done: {}, custom: {} };

  if (isObject(legacyDone)) {
    for (const [id, value] of Object.entries(legacyDone)) {
      if (value === true) state.done[id] = { v: true, at: 0 };
    }
  }

  if (Array.isArray(legacyCustom)) {
    for (const todo of legacyCustom) {
      if (isObject(todo) && typeof todo.id === "string") {
        state.custom[todo.id] = { v: todo as unknown as Todo, at: 0 };
      }
    }
  }

  return state;
}
