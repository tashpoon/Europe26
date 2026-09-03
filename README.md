# Europe + Turkey 2026

Melbourne → Europe → London → Turkey → Melbourne, 9 Sep – 28 Oct 2026.

A day-by-day itinerary with where to sleep each night, plus a booking checklist
you can tick off — optionally shared between two phones. A Next.js site that
deploys to Vercel; the pages are static, with one small API route for sharing.

## Deploy to Vercel

The repo is zero-config — Vercel detects Next.js and needs no build settings.
Environment variables are only needed for the shared checklist (see below); the
site deploys and works without them.

**From the dashboard (easiest):**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `tashpoon/Europe26`
3. Pick the `claude/europe-trip-webpage-mo8uoi` branch (or merge it to `main`
   first and deploy that)
4. Deploy — it's live in about a minute

**From the CLI:**

```bash
npm i -g vercel
vercel          # preview deploy
vercel --prod   # production
```

Every push to the connected branch redeploys automatically.

## Sharing the checklist between two phones

Out of the box, ticks save to whichever browser you're using and go no further.
To share one list between two people, attach a store and set a code.

**1. Add Upstash Redis** — Vercel dashboard → your project → **Storage** →
**Marketplace Database Providers** → **Upstash** → **Redis** → Create. Accept
the free tier and connect it to this project. Vercel writes the
`KV_REST_API_URL` and `KV_REST_API_TOKEN` environment variables for you.

**2. Set a trip code** — Settings → **Environment Variables** → add
`TRIP_PASSPHRASE` with any phrase you'll both remember. Apply it to
Production (and Preview, if you want previews to share the same list).

**3. Redeploy**, then on each phone open the Checklist tab, tap **Share with
partner**, and enter the code once. It's remembered per device.

Until all three are done the site works exactly as before — the sync bar just
says sharing isn't set up, and ticks stay local.

### How it behaves on the road

Local-first by design, because half this trip is in mountains:

- A tick applies **instantly**, offline or not, and is saved on the device.
- When there's signal it syncs; the bar shows `Offline — will sync` otherwise.
- Changes reach the other phone within about 12 seconds, no reload needed.
- Both of you can tick different things with no signal at all. When you're both
  back online, everything merges — nobody's work is overwritten.
- Tick the *same* item on both phones and the later tap wins.
- Deleting a custom task leaves a tombstone, so the delete survives a merge with
  a phone that still has it.

The passphrase is only ever compared on the server, in constant time, and is
never bundled into the page.

### One thing to watch

Vercel gives every deployment its own preview URL. Browser storage is
per-domain, so ticks made on `europe26-a1b2c3.vercel.app` won't appear on your
main domain — it looks like they vanished. Bookmark the production URL and use
only that. (Once sync is on, connecting the same code on both closes that gap.)

## Run locally

```bash
npm install
npm run dev     # http://localhost:3000
```

Other scripts: `npm run build`, `npm start`, `npm run typecheck`.

## How it's put together

```
app/
  layout.tsx        page shell, metadata, favicon
  page.tsx          renders <TripApp />
  globals.css       all styling — dark navy + gold, responsive
components/
  TripApp.tsx       tabs, countdown, storage wiring
  ItineraryTab.tsx  legs + sleep-type filter
  DayCard.tsx       one expandable day
  ChecklistTab.tsx  booking checklist with overdue detection
  PhotoImage.tsx    hotlinked photo with emoji fallback
  SyncBar.tsx       sharing status and the trip-code prompt
lib/
  data/europe.ts    Europe itinerary
  data/turkey.ts    Turkey itinerary
  data/todos.ts     booking checklist
  dates.ts          date maths and formatting
  constants.ts      sleep types, urgency levels, storage keys
  photos.ts         Unsplash photo IDs per day
  syncState.ts      merge rules for the shared checklist
  useTripState.ts   local-first state with background sync
  redis.ts          Upstash REST client (server only)
app/api/checklist/  GET and POST for the shared list
```

### Editing the trip

Everything lives in `lib/data/`. Days carry an `iso` date (`YYYY-MM-DD`) and
weekday names are computed from it, so you can't get a weekday wrong — change
the date and the label follows. Multi-night blocks add `isoEnd`.

Checklist deadlines are also ISO dates. Anything past today that isn't ticked
shows as **Overdue** in red.

### Notes on the port

This started as a Claude artifact (`useState` + `window.storage`). Two things
changed in the move:

- **Storage** moved from `window.storage` to `localStorage`, with an optional
  shared layer on top (see *Sharing the checklist* above). Ticks made before
  sync existed are migrated automatically rather than lost.
- **Dates are formatted by hand**, not with `toLocaleDateString` — Node and
  Chromium ship different ICU data (`Wed 9 Sept` vs `Wed, 9 Sept`), which
  otherwise causes a hydration mismatch.

The countdown and the Today marker render only after mount. The server has no
viewer timezone, so guessing one would flash a wrong day before hydration.

### Shape of the trip

| Leg | Dates | Nights |
| --- | --- | --- |
| Minden → Heidelberg → Zurich | 9–14 Sep | van + campsite |
| Dolomites | 15–16 Sep | campsite |
| Slovenia (Bled, Triglav, Ljubljana, Soča) | 17–21 Sep | van + campsite |
| Budapest | 22–23 Sep | campsite |
| Slovakia | 24–25 Sep | van |
| Poland (Kraków → Białowieża) | 26 Sep – 3 Oct | van + campsite |
| Back to Minden, van goes home | 4–5 Oct | hotel |
| Berlin | 6–8 Oct | 3 nights |
| London | 9–13 Oct | 5 nights |
| Turkey (solo) | 14–28 Oct | see the Turkey tab |

24 van nights, 8 countries, ~5,400km before the van goes back.

### Open questions

These are **⚠️ Plan conflicts** items at the top of the checklist rather than
things quietly decided in the data:

- **Which London airport does EZY8630 land at?** easyJet flies BER to both
  Gatwick and Luton, and the transfers into central London differ completely.
  The departure time matters too — it decides whether a Thursday night out in
  Berlin is realistic.
- **Białowieża → Minden on 4 Oct is about 11 hours of driving.** The plan drops
  the Poznań night but kept the old `5h 30m · 530km` label, which was the
  distance to Poznań rather than Minden. The real run is roughly 1,030km. Either
  break it near Poznań or leave Białowieża a day earlier.
- **Does SunExpress fly London Stansted → Kayseri on Wed 14 Oct?** It's a weekly
  service. If not, the fallback is London → Istanbul → Kayseri and the
  Cappadocia days shift.

Two smaller things fixed in the data rather than flagged: the last van night
books a hotel, so it's tagged as a hotel night (which puts the total back at the
24 van nights the plan claims), and the Soča rest day sits under Slovenia rather
than Hungary, where the source had filed it.
