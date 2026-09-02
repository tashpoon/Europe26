export type SleepKind = "van" | "camp" | "hostel" | "train" | "boat" | "bus";

export type Urgency = "now" | "soon" | "later" | "done";

export interface Stop {
  place: string;
  duration: string;
  what: string;
}

export interface Day {
  /** ISO date (YYYY-MM-DD) this day starts. Weekday labels are derived from this. */
  iso: string;
  /** ISO date this day block ends, for multi-night stays. Omit for single days. */
  isoEnd?: string;
  title: string;
  /** Driving/travel summary, e.g. "4h driving · 430km via A2". "0km" means a rest day. */
  drive: string;
  sleep: SleepKind;
  bed: string;
  stops: Stop[];
  /** Highlights for the day. */
  hi: string[];
  tip: string | null;
  gem: string | null;
}

export interface Leg {
  id: string;
  flag: string;
  label: string;
  emoji: string;
  /** Background colour for the leg header and accent panels. */
  bg: string;
  /** Accent colour for the leg. */
  ac: string;
  days: Day[];
}

export interface Todo {
  id: string;
  urgency: Urgency;
  /** Deadline as an ISO date, or null when there is no meaningful deadline. */
  bookBy: string | null;
  cat: string;
  item: string;
  /** ISO date of the trip day this booking is for, or null. */
  tripDate: string | null;
  url: string;
  notes: string;
  /** True for tasks the user added in the browser. */
  custom?: boolean;
}
