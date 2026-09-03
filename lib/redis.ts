/**
 * Minimal Upstash REST client. The API is two calls, so a dependency would be
 * more version drift than it's worth.
 *
 * Server-side only — imported solely by app/api/checklist/route.ts. None of
 * these env vars carry a NEXT_PUBLIC_ prefix, so the token and passphrase are
 * never inlined into the browser bundle even if this were imported by mistake.
 *
 * Vercel's Upstash integration writes KV_REST_API_* ; connecting Upstash
 * directly writes UPSTASH_REDIS_REST_* . We read either so the site works
 * however the store was attached.
 */

function config(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

export function isConfigured(): boolean {
  return config() !== null && Boolean(process.env.TRIP_PASSPHRASE);
}

/** Which piece of setup is missing, for an actionable error rather than a 500. */
export function missingConfig(): string[] {
  const missing: string[] = [];
  if (config() === null) missing.push("Upstash Redis (KV_REST_API_URL / KV_REST_API_TOKEN)");
  if (!process.env.TRIP_PASSPHRASE) missing.push("TRIP_PASSPHRASE");
  return missing;
}

export async function redisGet(key: string): Promise<string | null> {
  const cfg = config();
  if (!cfg) throw new Error("Redis is not configured");

  const res = await fetch(`${cfg.url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${cfg.token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash GET failed: ${res.status}`);

  const body = (await res.json()) as { result: string | null };
  return body.result;
}

export async function redisSet(key: string, value: string): Promise<void> {
  const cfg = config();
  if (!cfg) throw new Error("Redis is not configured");

  const res = await fetch(`${cfg.url}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}` },
    body: value,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash SET failed: ${res.status}`);
}
