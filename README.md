# Europe + Turkey 2026

Melbourne → Europe → London → Turkey → Melbourne, 9 Sep – 28 Oct 2026.

A day-by-day itinerary with where to sleep each night, plus a booking checklist
that ticks off and saves in your browser. Built as a static Next.js site, ready
to deploy on Vercel.

## Deploy to Vercel

The repo is zero-config — Vercel detects Next.js and needs no environment
variables or build settings.

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
lib/
  data/europe.ts    Europe itinerary
  data/turkey.ts    Turkey itinerary
  data/todos.ts     booking checklist
  dates.ts          date maths and formatting
  constants.ts      sleep types, urgency levels, storage keys
  photos.ts         Unsplash photo IDs per day
  useLocalStorage.ts
```

### Editing the trip

Everything lives in `lib/data/`. Days carry an `iso` date (`YYYY-MM-DD`) and
weekday names are computed from it, so you can't get a weekday wrong — change
the date and the label follows. Multi-night blocks add `isoEnd`.

Checklist deadlines are also ISO dates. Anything past today that isn't ticked
shows as **Overdue** in red.

### Notes on the port

This started as a Claude artifact (`useState` + `window.storage`). Three things
changed in the move:

- **Weekdays were all one day off.** The original used 2025's calendar against
  2026 dates — it called 9 Sep a Tuesday when it's a Wednesday. Dates are now
  computed from the real 2026 calendar.
- **Storage** moved from `window.storage` to `localStorage`, so ticks live in
  whichever browser you're using rather than syncing across devices.
- **Dates are formatted by hand**, not with `toLocaleDateString` — Node and
  Chromium ship different ICU data (`Wed 9 Sept` vs `Wed, 9 Sept`), which
  otherwise causes a hydration mismatch.

Three unresolved conflicts in the original plan are surfaced as **⚠️ Plan
conflicts** items at the top of the checklist rather than silently resolved.
