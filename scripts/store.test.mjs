/**
 * Exercises lib/store.ts against a real Postgres through the real Neon driver.
 *
 * A mock endpoint speaks Neon's HTTP protocol and forwards to a local
 * Postgres, so the driver, the SQL, the transaction batching and the row
 * decoding are all the genuine article — only the network hop is stubbed.
 *
 *   node --experimental-strip-types scripts/store.test.mjs
 *
 * Expects NEON_TEST_ENDPOINT and DATABASE_URL to be set by the caller.
 */
import { neonConfig } from "@neondatabase/serverless";

neonConfig.fetchEndpoint = process.env.NEON_TEST_ENDPOINT;

const { getStore } = await import("../lib/store.ts");
const { EMPTY_STATE, setDone, addCustom, removeCustom, doneMap, customList } =
  await import("../lib/syncState.ts");

const fail = [];
const check = (name, cond) => {
  console.log(`  ${cond ? "ok  " : "FAIL"} - ${name}`);
  if (!cond) fail.push(name);
};

const store = getStore();
check("picks the postgres backend", store?.kind === "postgres");

const todo = (id, item) => ({
  id, item, cat: "📋 Admin", urgency: "later",
  bookBy: null, tripDate: null, url: "", notes: "", custom: true,
});

// Reading an empty store creates the table and returns nothing.
let state = await store.merge(EMPTY_STATE);
check("starts empty", Object.keys(state.done).length === 0);

// Tash ticks two things.
state = await store.merge(setDone(setDone(EMPTY_STATE, "7", true, 1000), "12", true, 1001));
check("both ticks stored", doneMap(state)["7"] === true && doneMap(state)["12"] === true);

// The partner's phone, which never saw those, ticks a third.
state = await store.merge(setDone(EMPTY_STATE, "19", true, 1002));
check(
  "partner's tick joins the others",
  Object.keys(doneMap(state)).sort().join(",") === "12,19,7",
);

// A stale edit from a phone that was offline must not win.
state = await store.merge(setDone(EMPTY_STATE, "7", false, 500));
check("stale untick rejected", doneMap(state)["7"] === true);

// A genuinely newer untick must win.
state = await store.merge(setDone(EMPTY_STATE, "7", false, 5000));
check("newer untick applied", doneMap(state)["7"] === undefined);

// Custom tasks round-trip through JSONB intact.
state = await store.merge(addCustom(EMPTY_STATE, todo("custom-1", "Green Card"), 2000));
const added = customList(state);
check("custom task round-trips", added.length === 1 && added[0].item === "Green Card");
check("custom task keeps its fields", added[0].cat === "📋 Admin" && added[0].custom === true);

// Deleting leaves a tombstone the peer cannot undo.
state = await store.merge(removeCustom(state, "custom-1", 3000));
check("delete removes it", customList(state).length === 0);
state = await store.merge(addCustom(EMPTY_STATE, todo("custom-1", "Green Card"), 2000));
check("peer cannot resurrect a deleted task", customList(state).length === 0);

// Timestamps survive the BIGINT round trip rather than coming back as strings.
state = await store.merge(setDone(EMPTY_STATE, "99", true, 1735689600000));
check("large timestamps survive", state.done["99"].at === 1735689600000);
check("timestamp is a number, not a string", typeof state.done["99"].at === "number");

// A batch big enough to matter goes through in one transaction.
let bulk = EMPTY_STATE;
for (let i = 0; i < 60; i++) bulk = setDone(bulk, `bulk-${i}`, true, 9000 + i);
state = await store.merge(bulk);
check("60-item batch lands", Object.keys(doneMap(state)).filter((k) => k.startsWith("bulk-")).length === 60);

console.log(fail.length ? `\n${fail.length} FAILED:\n - ${fail.join("\n - ")}` : "\nall store checks passed");
process.exit(fail.length ? 1 : 0);
