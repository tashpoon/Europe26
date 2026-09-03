import { neon, neonConfig } from "@neondatabase/serverless";
import { EMPTY_STATE, mergeState, parseState, type TripState } from "./syncState";

/**
 * Where the shared checklist lives. Two backends, picked from whichever
 * environment variables are present:
 *
 *   Postgres (Neon)  — DATABASE_URL / POSTGRES_URL / NEON_DATABASE_URL
 *   Redis (Upstash)  — KV_REST_API_* or UPSTASH_REDIS_REST_*
 *
 * Postgres wins if both are set. It's the better fit: one row per checklist
 * item means a conditional upsert does the last-write-wins merge inside the
 * database, so two phones writing at the same moment can't lose an edit — the
 * Redis path has to read, merge and write back, which has a race window.
 *
 * Server-side only, imported just by app/api/checklist/route.ts. None of these
 * variables carry a NEXT_PUBLIC_ prefix, so no credential reaches the browser
 * bundle even if this were imported by mistake.
 */

export interface Store {
  kind: "postgres" | "redis";
  /** Applies `incoming` on top of what's stored and returns the result. */
  merge(incoming: TripState): Promise<TripState>;
}

const REDIS_KEY = "europe26:checklist";

// ── Postgres (Neon) ──────────────────────────────────────────────

function postgresUrl(): string | null {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.NEON_DATABASE_URL ??
    null
  );
}

/** Rows are (kind, item_id) → value + the timestamp of the edit that set it. */
type Row = { kind: string; item_id: string; value: unknown; updated_at: string };

function rowsToState(rows: Row[]): TripState {
  const state: TripState = { done: {}, custom: {} };
  for (const row of rows) {
    const at = Number(row.updated_at);
    if (row.kind === "done" && typeof row.value === "boolean") {
      state.done[row.item_id] = { v: row.value, at };
    } else if (row.kind === "custom") {
      state.custom[row.item_id] = { v: (row.value ?? null) as never, at };
    }
  }
  return parseState(state);
}

/**
 * Point the driver at a Neon-compatible proxy instead of neon.tech — Neon Local
 * for offline development, or a stand-in during tests. Unset in production,
 * where the driver derives the endpoint from the connection string.
 */
if (process.env.NEON_FETCH_ENDPOINT) {
  neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;
}

function postgresStore(url: string): Store {
  const sql = neon(url);

  // Created once per process rather than on every poll. A cold start pays for
  // one extra round trip; every request after that skips it.
  let ready: Promise<void> | null = null;
  const ensureTable = () => {
    ready ??= sql`
      CREATE TABLE IF NOT EXISTS europe26_checklist (
        kind       TEXT   NOT NULL,
        item_id    TEXT   NOT NULL,
        value      JSONB,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (kind, item_id)
      )
    `
      .then(() => undefined)
      .catch((err) => {
        ready = null; // Let the next request try again.
        throw err;
      });
    return ready;
  };

  return {
    kind: "postgres",
    async merge(incoming) {
      await ensureTable();

      const writes = [
        ...Object.entries(incoming.done).map(([id, e]) => ["done", id, e.v, e.at] as const),
        ...Object.entries(incoming.custom).map(([id, e]) => ["custom", id, e.v, e.at] as const),
      ];

      // The WHERE clause is the merge: a row only ever moves forward in time,
      // so an edit arriving late — a phone catching up after a week in the
      // mountains — can never overwrite a newer one. Because the comparison
      // happens inside the statement, two phones writing at the same instant
      // both land correctly with no read-modify-write race.
      if (writes.length > 0) {
        await sql.transaction(
          writes.map(
            ([kind, id, value, at]) => sql`
              INSERT INTO europe26_checklist (kind, item_id, value, updated_at)
              VALUES (${kind}, ${id}, ${JSON.stringify(value ?? null)}::jsonb, ${at})
              ON CONFLICT (kind, item_id) DO UPDATE
                SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
                WHERE europe26_checklist.updated_at < EXCLUDED.updated_at
            `,
          ),
        );
      }

      const rows = (await sql`
        SELECT kind, item_id, value, updated_at FROM europe26_checklist
      `) as Row[];
      return rowsToState(rows);
    },
  };
}

// ── Redis (Upstash) ──────────────────────────────────────────────

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

function redisStore(cfg: { url: string; token: string }): Store {
  const auth = { Authorization: `Bearer ${cfg.token}` };

  return {
    kind: "redis",
    async merge(incoming) {
      const res = await fetch(`${cfg.url}/get/${encodeURIComponent(REDIS_KEY)}`, {
        headers: auth,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Upstash GET failed: ${res.status}`);

      let stored: TripState = EMPTY_STATE;
      const body = (await res.json()) as { result: string | null };
      if (body.result) {
        try {
          stored = parseState(JSON.parse(body.result));
        } catch {
          // A corrupt value shouldn't wedge the checklist; the next write from
          // either phone repopulates it.
        }
      }

      const merged = mergeState(stored, incoming);
      const put = await fetch(`${cfg.url}/set/${encodeURIComponent(REDIS_KEY)}`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify(merged),
        cache: "no-store",
      });
      if (!put.ok) throw new Error(`Upstash SET failed: ${put.status}`);

      return merged;
    },
  };
}

// ── Selection ────────────────────────────────────────────────────

export function getStore(): Store | null {
  const pg = postgresUrl();
  if (pg) return postgresStore(pg);

  const redis = redisConfig();
  if (redis) return redisStore(redis);

  return null;
}

export function isConfigured(): boolean {
  return getStore() !== null && Boolean(process.env.TRIP_PASSPHRASE);
}

/** Names what's still missing, so the UI can say something actionable. */
export function missingConfig(): string[] {
  const missing: string[] = [];
  if (getStore() === null) {
    missing.push("a database — set DATABASE_URL (Neon) or KV_REST_API_URL (Upstash)");
  }
  if (!process.env.TRIP_PASSPHRASE) missing.push("TRIP_PASSPHRASE");
  return missing;
}
