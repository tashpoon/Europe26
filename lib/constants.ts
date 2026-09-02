import type { SleepKind, Urgency } from "./types";

export const TRIP_START = "2026-09-09";
export const TRIP_END = "2026-10-28";

export const SLEEP: Record<SleepKind, { icon: string; label: string; col: string }> = {
  van: { icon: "🚐", label: "Sleep in Van", col: "#4ecdc4" },
  camp: { icon: "⛺", label: "Campsite", col: "#a8e063" },
  hostel: { icon: "🏨", label: "Hostel/Hotel", col: "#f7c59f" },
  train: { icon: "🚆", label: "Train day", col: "#d4a0ff" },
  boat: { icon: "⛵", label: "Gulet/Boat", col: "#4fc3f7" },
  bus: { icon: "🚌", label: "Overnight Bus", col: "#ff8a65" },
};

export const URGENCY: Record<
  Urgency,
  { label: string; bg: string; border: string; dot: string; text: string }
> = {
  now: {
    label: "Book NOW",
    bg: "rgba(220,50,50,0.15)",
    border: "rgba(220,50,50,0.4)",
    dot: "#e05555",
    text: "#ff9090",
  },
  soon: {
    label: "Book Soon",
    bg: "rgba(220,150,30,0.15)",
    border: "rgba(220,150,30,0.4)",
    dot: "#e09030",
    text: "#ffcc70",
  },
  later: {
    label: "Book Later",
    bg: "rgba(80,180,80,0.12)",
    border: "rgba(80,180,80,0.35)",
    dot: "#50c050",
    text: "#90e090",
  },
  done: {
    label: "Done ✓",
    bg: "rgba(100,100,100,0.1)",
    border: "rgba(100,100,100,0.25)",
    dot: "#606060",
    text: "#909090",
  },
};

export const TODO_CATEGORIES = [
  "🏕️ Campsites",
  "🎟️ Entry",
  "✈️ Flights",
  "🚆 Trains",
  "🏨 Stays",
  "🚗 Driving",
  "🛂 Visas & Docs",
  "📋 Admin",
  "📱 Apps",
  "⛵ Turkey",
  "🎈 Turkey",
  "🚌 Turkey",
  "🏨 Turkey",
  "🎟️ Turkey",
  "📱 Turkey",
];

export const STORAGE_KEY = "europe26-checklist-v1";
export const STORAGE_KEY_CUSTOM = "europe26-checklist-v1-custom";
