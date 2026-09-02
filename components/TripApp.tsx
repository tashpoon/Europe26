"use client";

import { useEffect, useState } from "react";
import type { SleepKind, Todo } from "@/lib/types";
import { EUROPE_LEGS } from "@/lib/data/europe";
import { TURKEY_LEGS } from "@/lib/data/turkey";
import { TODOS } from "@/lib/data/todos";
import { STORAGE_KEY, STORAGE_KEY_CUSTOM, TRIP_END, TRIP_START } from "@/lib/constants";
import { daysBetween, formatShort, isOverdue, todayIso } from "@/lib/dates";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { ItineraryTab } from "./ItineraryTab";
import { ChecklistTab } from "./ChecklistTab";

type Tab = "europe" | "turkey" | "checklist";

const EUROPE_FILTERS: (SleepKind | "all")[] = ["all", "van", "camp", "hostel", "train"];
const TURKEY_FILTERS: (SleepKind | "all")[] = ["all", "hostel", "bus", "boat"];

export function TripApp() {
  const [tab, setTab] = useState<Tab>("europe");

  // Rendered on the server too, so start from the trip's own timezone-free
  // date and let the client correct it to the viewer's actual today on mount.
  const [today, setToday] = useState(TRIP_START);
  useEffect(() => setToday(todayIso()), []);

  const checklist = useLocalStorage<Record<string, boolean>>(STORAGE_KEY, {});
  const customTodos = useLocalStorage<Todo[]>(STORAGE_KEY_CUSTOM, []);

  const all = [...TODOS, ...customTodos.value];
  const doneCount = all.filter(
    (t) => checklist.value[t.id] === true || t.urgency === "done",
  ).length;
  const overdueCount = all.filter((t) =>
    isOverdue(t.bookBy, today, checklist.value[t.id] === true || t.urgency === "done"),
  ).length;

  const daysToGo = daysBetween(today, TRIP_START);
  const daysToEnd = daysBetween(today, TRIP_END);

  const countdown =
    daysToGo > 0
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
            { key: "europe", label: "🗺️ Europe", sub: "9 Sep – 14 Oct" },
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
          (checklist.ready && customTodos.ready ? (
            <ChecklistTab
              today={today}
              done={checklist.value}
              setDone={checklist.save}
              custom={customTodos.value}
              setCustom={customTodos.save}
            />
          ) : (
            <p className="empty">Loading your ticks…</p>
          ))}
      </main>

      <footer className="colophon">
        TASH · EUROPE + TURKEY 2026 · TICKS SAVE TO THIS BROWSER
      </footer>
    </>
  );
}
