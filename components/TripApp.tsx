"use client";

import { useEffect, useState } from "react";
import type { SleepKind } from "@/lib/types";
import { EUROPE_LEGS } from "@/lib/data/europe";
import { TURKEY_LEGS } from "@/lib/data/turkey";
import { TODOS } from "@/lib/data/todos";
import { TRIP_END, TRIP_START } from "@/lib/constants";
import { daysBetween, formatShort, isOverdue, todayIso } from "@/lib/dates";
import { customList, doneMap } from "@/lib/syncState";
import { useTripState } from "@/lib/useTripState";
import { ItineraryTab } from "./ItineraryTab";
import { ChecklistTab } from "./ChecklistTab";

type Tab = "europe" | "turkey" | "checklist";

const EUROPE_FILTERS: (SleepKind | "all")[] = ["all", "van", "camp", "hostel", "train"];
const TURKEY_FILTERS: (SleepKind | "all")[] = ["all", "hostel", "bus", "boat"];

export function TripApp() {
  const [tab, setTab] = useState<Tab>("europe");

  // Empty until mount: the server has no viewer timezone, and guessing one
  // flashes a wrong "Today" marker before hydration corrects it. Every date
  // comparison treats "" as "no day is today and nothing is overdue yet".
  const [today, setToday] = useState("");
  useEffect(() => setToday(todayIso()), []);

  const trip = useTripState();

  const done = doneMap(trip.state);
  const all = [...TODOS, ...customList(trip.state)];
  const isDone = (id: string, urgency: string) =>
    done[id] === true || urgency === "done";

  const doneCount = all.filter((t) => isDone(t.id, t.urgency)).length;
  const overdueCount = all.filter((t) =>
    isOverdue(t.bookBy, today, isDone(t.id, t.urgency)),
  ).length;

  const daysToGo = today ? daysBetween(today, TRIP_START) : 0;
  const daysToEnd = today ? daysBetween(today, TRIP_END) : -1;

  const countdown = !today
    ? null
    : daysToGo > 0
      ? { num: daysToGo, label: daysToGo === 1 ? "day to go" : "days to go" }
      : daysToEnd >= 0
        ? { num: Math.abs(daysToGo) + 1, label: "day of the trip" }
        : null;

  return (
    <>
      <header className="masthead">
        <div className="kicker">2026 Adventure</div>
        <h1>Melbourne → Europe → London → Turkey → Melbourne</h1>
        <div className="masthead-sub">
          {formatShort(TRIP_START)} – {formatShort(TRIP_END)}, 2026 · 10 countries
          <br />
          🇦🇺🇩🇪🇨🇭🇮🇹🇸🇮🇭🇺🇸🇰🇵🇱🇬🇧🇹🇷
        </div>
        {countdown && (
          <div className="countdown">
            <span className="countdown-num">{countdown.num}</span>
            <span className="countdown-label">{countdown.label}</span>
          </div>
        )}
      </header>

      <nav className="tabs" role="tablist" aria-label="Trip sections">
        {(
          [
            { key: "europe", label: "🗺️ Europe", sub: "9 Sep – 13 Oct" },
            { key: "turkey", label: "🕌 Turkey (solo)", sub: "14 – 28 Oct" },
            {
              key: "checklist",
              label: "✅ Checklist",
              sub: `${doneCount}/${all.length}${overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}`,
            },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            className="tab"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
          >
            <span className="tab-label" style={{ display: "block" }}>
              {item.label}
            </span>
            <span className="tab-sub" style={{ display: "block" }}>
              {item.sub}
            </span>
          </button>
        ))}
      </nav>

      <main className="shell">
        {tab === "europe" && (
          <ItineraryTab legs={EUROPE_LEGS} today={today} filterOptions={EUROPE_FILTERS} />
        )}

        {tab === "turkey" && (
          <>
            <div className="turkey-banner">
              <div className="kicker" style={{ letterSpacing: 3, color: "#e8b860" }}>
                Solo Female Travel 🇹🇷
              </div>
              <div style={{ fontSize: 13, color: "#f5e8d0", lineHeight: 1.5 }}>
                Cappadocia → Gulet Sail (Fethiye → Bodrum) → Istanbul
              </div>
              <div style={{ fontSize: 11, color: "#8a7040", marginTop: 4 }}>
                14 – 28 Oct 2026 · 14 nights · 2 Cappadocia + 1 night bus + 7 gulet + 1
                Bodrum + 4 Istanbul
              </div>
              <p className="safety">
                ⚠️ <strong>Solo female safety:</strong> Use BiTaksi not street taxis · Stay
                in Sultanahmet/Karaköy/Beyoğlu at night · Keep your accommodation address
                in Turkish on your phone · Dress modestly at mosques · October is ideal —
                comfortable temperatures, fewer crowds
              </p>
            </div>
            <ItineraryTab legs={TURKEY_LEGS} today={today} filterOptions={TURKEY_FILTERS} />
          </>
        )}

        {tab === "checklist" &&
          (trip.ready ? (
            <ChecklistTab
              today={today}
              state={trip.state}
              update={trip.update}
              sync={{
                status: trip.status,
                lastSync: trip.lastSync,
                connect: trip.connect,
                disconnect: trip.disconnect,
              }}
            />
          ) : (
            <p className="empty">Loading your ticks…</p>
          ))}
      </main>

      <footer className="colophon">
        TASH · EUROPE + TURKEY 2026
      </footer>
    </>
  );
}
