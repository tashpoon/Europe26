import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { isConfigured, missingConfig, redisGet, redisSet } from "@/lib/redis";
import { EMPTY_STATE, mergeState, parseState, type TripState } from "@/lib/syncState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "europe26:checklist";

/** Compares in constant time so the passphrase can't be recovered by timing. */
function passphraseOk(supplied: string | null): boolean {
  const expected = process.env.TRIP_PASSPHRASE;
  if (!expected || !supplied) return false;

  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function notConfigured() {
  return NextResponse.json(
    { error: "sync_not_configured", missing: missingConfig() },
    { status: 503 },
  );
}

async function readState(): Promise<TripState> {
  const raw = await redisGet(KEY);
  if (!raw) return EMPTY_STATE;
  try {
    return parseState(JSON.parse(raw));
  } catch {
    // A corrupt value shouldn't wedge the checklist — start clean and let the
    // next write from either phone repopulate it.
    return EMPTY_STATE;
  }
}

export async function GET(request: Request) {
  if (!isConfigured()) return notConfigured();
  if (!passphraseOk(request.headers.get("x-trip-key"))) {
    return NextResponse.json({ error: "bad_passphrase" }, { status: 401 });
  }

  try {
    return NextResponse.json({ state: await readState() });
  } catch {
    return NextResponse.json({ error: "store_unavailable" }, { status: 502 });
  }
}

/**
 * Merges the caller's state into what's stored and returns the result, so both
 * phones converge on the same list. Read-modify-write races between two people
 * ticking at the same instant are possible but self-correcting: the merge is
 * commutative, and the loser's next poll or push carries its edit back.
 */
export async function POST(request: Request) {
  if (!isConfigured()) return notConfigured();
  if (!passphraseOk(request.headers.get("x-trip-key"))) {
    return NextResponse.json({ error: "bad_passphrase" }, { status: 401 });
  }

  let incoming: TripState;
  try {
    const body = (await request.json()) as { state?: unknown };
    incoming = parseState(body.state);
  } catch {
    return NextResponse.json({ error: "bad_body" }, { status: 400 });
  }

  try {
    const merged = mergeState(await readState(), incoming);
    await redisSet(KEY, JSON.stringify(merged));
    return NextResponse.json({ state: merged });
  } catch {
    return NextResponse.json({ error: "store_unavailable" }, { status: 502 });
  }
}
