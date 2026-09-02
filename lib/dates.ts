/**
 * All trip dates are plain calendar dates with no timezone attached — a day on
 * the itinerary is that day wherever you happen to be standing. We parse them
 * at UTC noon so a viewer's local timezone can never shift them by a day.
 *
 * Formatting is done by hand rather than with toLocaleDateString: Node and
 * Chromium ship different ICU data ("Wed 9 Sept" vs "Wed, 9 Sept"), which
 * shows up as a hydration mismatch when the server and browser disagree.
 */

const MS_PER_DAY = 86_400_000;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function toDate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

/** Today as an ISO date string in the viewer's own timezone. */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Whole days from `from` to `to`. Negative when `to` is in the past. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / MS_PER_DAY);
}

/** ["Wed", "9", "Sep"] — the parts every formatter below is built from. */
export function dateParts(iso: string): [string, string, string] {
  const d = toDate(iso);
  return [
    WEEKDAYS[d.getUTCDay()],
    String(d.getUTCDate()),
    MONTHS[d.getUTCMonth()],
  ];
}

/** "Wed 9 Sep" */
export function formatDay(iso: string): string {
  return dateParts(iso).join(" ");
}

/** "9 Sep" */
export function formatShort(iso: string): string {
  const [, day, month] = dateParts(iso);
  return `${day} ${month}`;
}

/** "31 Jul 2026" */
export function formatWithYear(iso: string): string {
  const [, day, month] = dateParts(iso);
  return `${day} ${month} ${toDate(iso).getUTCFullYear()}`;
}

/** "Wed 9 Sep" or "Wed 7 Oct – Mon 12 Oct" for a multi-day block. */
export function formatRange(iso: string, isoEnd?: string): string {
  if (!isoEnd || isoEnd === iso) return formatDay(iso);
  return `${formatDay(iso)} – ${formatDay(isoEnd)}`;
}

/** The three date-derived states a day can be in. */
export type DayStatus = "past" | "today" | "future";

export function dayStatus(iso: string, isoEnd: string | undefined, today: string): DayStatus {
  const end = isoEnd ?? iso;
  if (today >= iso && today <= end) return "today";
  return today > end ? "past" : "future";
}

/** A booking deadline that has passed and is not ticked off is overdue. */
export function isOverdue(bookBy: string | null, today: string, done: boolean): boolean {
  return !done && bookBy !== null && bookBy < today;
}
