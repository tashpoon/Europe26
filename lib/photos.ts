/**
 * Unsplash photo IDs, one per itinerary day. These are hotlinked, so any of
 * them can 404 without warning — PhotoImage degrades to a gradient placeholder
 * rather than leaving a hole in the layout.
 */

const P = {
  arrival: "1573648952759-0a1bff8bba68",
  germanySouth: "1548813022-5f6b3a9de869",
  blackForest: "1499856871958-5b9627545d1a",
  zurich: "1515488764276-beab7607c1e6",
  dolomites: "1506905925346-21bda4d32df4",
  bled: "1523906921802-b5d2d899e93b",
  triglav: "1464822759023-fed622ff2c3b",
  ljubljana: "1491557345352-5929e343eb89",
  soca: "1439405326854-014607f694d7",
  budapest: "1541343672885-9be56236302a",
  banska: "1469854523086-cc02fe5d8800",
  krakow: "1565799557186-4fcad1c38c64",
  wieliczka: "1553913861-c0fddf2619ee",
  zakopane: "1551279880-03041531948f",
  warsaw: "1522813697520-32e4a4a60ad9",
  bialowieza: "1448375240586-882707db888b",
  poznan: "1565799557186-4fcad1c38c64",
  minden: "1467269204594-9661b134dd2b",
  berlin: "1560969184-10fe8719e047",
  london: "1513635269975-59663e0ac1ad",
  istanbul: "1541432901042-2d8bd64b4a9b",
  cappadocia: "1519451241324-20b4ea2c4220",
  gulet: "1504214208698-ea1916a2195a",
  bodrum: "1555990793-da11153b2473",
};

/** Photo per day, indexed by leg id then day index. */
const BY_LEG: Record<string, string[]> = {
  arrival: [P.arrival],
  "germany-south": [P.germanySouth],
  "germany-zurich": [P.blackForest],
  zurich: [P.zurich, P.zurich, P.zurich],
  dolomites: [P.dolomites, P.dolomites],
  slovenia: [P.bled, P.triglav, P.ljubljana, P.soca],
  hungary: [P.budapest, P.budapest],
  slovakia: [P.banska, P.banska],
  poland: [
    P.krakow,
    P.wieliczka,
    P.zakopane,
    P.zakopane,
    P.warsaw,
    P.warsaw,
    P.bialowieza,
    P.poznan,
    P.minden,
  ],
  finale: [P.berlin, P.berlin, P.berlin, P.london, P.london],
  cappadocia: [P.cappadocia, P.cappadocia, P.cappadocia],
  gulet: [P.gulet, P.gulet, P.gulet, P.gulet, P.gulet, P.gulet, P.bodrum],
  istanbul: [P.istanbul, P.istanbul, P.istanbul, P.istanbul, P.istanbul],
};

export function photoUrl(legId: string, dayIndex: number): string | null {
  const id = BY_LEG[legId]?.[dayIndex];
  if (!id) return null;
  return `https://images.unsplash.com/photo-${id}?w=900&q=80&fit=crop`;
}
