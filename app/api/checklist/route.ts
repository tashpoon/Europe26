import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getStore, isConfigured, missingConfig } from "@/lib/store";
import { EMPTY_STATE, parseState, type TripState } from "@/lib/syncState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Compares in constant time so the passphrase can't be recovered by timing. */
function passphraseOk(supplied: string | null): boolean {
  const expected = process.env.TRIP_PASSPHRASE;
  if (!expected || !supplied) return false;

  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Shared guard: 503 when unconfigured, 401 on a bad code, else the store. */
function authorise(request: Request) {
  if (!isConfigured()) {
    return {
      error: NextResponse.json(
        { error: "sync_not_configured", missing: missingConfig() },
        { status: 503 },
      ),
    };
  }
  if (!passphraseOk(request.headers.get("x-trip-key"))) {
    return { error: NextResponse.json({ error: "bad_passphrase" }, { status: 401 }) };
  }
  return { store: getStore()! };
}

/** Reading is merging an empty state: it returns what's stored, unchanged. */
export async function GET(request: Request) {
  const gate = authorise(request);
  if (gate.error) return gate.error;

  try {
    return NextResponse.json({ state: await gate.store.merge(EMPTY_STATE) });
  } catch {
    return NextResponse.json({ error: "store_unavailable" }, { status: 502 });
  }
}

/**
 * Merges the caller's state into what's stored and returns the result, so both
 * phones converge on the same list.
 */
export async function POST(request: Request) {
  const gate = authorise(request);
  if (gate.error) return gate.error;

  let incoming: TripState;
  try {
    const body = (await request.json()) as { state?: unknown };
    incoming = parseState(body.state);
  } catch {
    return NextResponse.json({ error: "bad_body" }, { status: 400 });
  }

  try {
    return NextResponse.json({ state: await gate.store.merge(incoming) });
  } catch {
    return NextResponse.json({ error: "store_unavailable" }, { status: 502 });
  }
}
