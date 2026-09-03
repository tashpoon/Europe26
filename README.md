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

This started as a Claude artifact (`useState` + `window.storage`). Two things
changed in the move:

- **Storage** moved from `window.storage` to `localStorage`, so ticks live in
  whichever browser you're using rather than syncing across devices.
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
