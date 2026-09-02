"use client";

import { useState, type CSSProperties } from "react";
import type { Leg, SleepKind } from "@/lib/types";
import { SLEEP } from "@/lib/constants";
import { DayCard, legDateRange } from "./DayCard";

type Filter = SleepKind | "all";

export function ItineraryTab({
  legs,
  today,
  filterOptions,
}: {
  legs: Leg[];
  today: string;
  filterOptions: Filter[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);

  const visible = legs
    .map((leg) => ({
      leg,
      // Keep the original index so each day keeps its own photo when filtered.
      days: leg.days
        .map((day, index) => ({ day, index }))
        .filter(({ day }) => filter === "all" || day.sleep === filter),
    }))
    .filter(({ days }) => days.length > 0);

  return (
    <div>
      <div className="filterbar">
        <div className="filterbar-row">
          <span className="filterbar-label">Filter</span>
          {filterOptions.map((key) => (
            <button
              key={key}
              className="chip"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {key === "all" ? "🗺️ All" : `${SLEEP[key].icon} ${SLEEP[key].label}`}
            </button>
          ))}
          <span className="legend">
            {filterOptions
              .filter((k): k is SleepKind => k !== "all")
              .map((key) => (
                <span key={key} style={{ color: SLEEP[key].col }}>
                  {SLEEP[key].icon} {SLEEP[key].label}
                </span>
              ))}
          </span>
        </div>
      </div>

      <div className="legs">
        {visible.length === 0 && (
          <p className="empty">No days match that filter.</p>
        )}

        {visible.map(({ leg, days }) => (
          <section
            className="leg"
            key={leg.id}
            style={
              {
                "--ac": leg.ac,
                "--leg-bg-strong": `${leg.bg}ee`,
                "--leg-bg-soft": `${leg.bg}55`,
              } as CSSProperties
            }
          >
            <header className="leg-head">
              <span className="leg-emoji" aria-hidden="true">
                {leg.emoji}
              </span>
              <div>
                <div className="leg-title">
                  {leg.flag} {leg.label}
                </div>
                <div className="leg-dates">
                  {legDateRange(leg)} · {leg.days.length}{" "}
                  {leg.days.length === 1 ? "entry" : "entries"}
                </div>
              </div>
            </header>

            {days.map(({ day, index }) => {
              const key = `${leg.id}-${index}`;
              return (
                <DayCard
                  key={key}
                  day={day}
                  leg={leg}
                  dayIndex={index}
                  today={today}
                  isOpen={open === key}
                  onToggle={() => setOpen(open === key ? null : key)}
                />
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
