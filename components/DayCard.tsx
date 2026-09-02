"use client";

import type { CSSProperties } from "react";
import type { Day, Leg } from "@/lib/types";
import { SLEEP } from "@/lib/constants";
import { dateParts, dayStatus, formatDay, formatRange, formatShort } from "@/lib/dates";
import { PhotoImage } from "./PhotoImage";

export function DayCard({
  day,
  leg,
  dayIndex,
  today,
  isOpen,
  onToggle,
}: {
  day: Day;
  leg: Leg;
  dayIndex: number;
  today: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const sleep = SLEEP[day.sleep];
  const status = dayStatus(day.iso, day.isoEnd, today);
  const label = day.isoEnd ? formatRange(day.iso, day.isoEnd) : formatDay(day.iso);

  // The date tile stacks weekday over day-of-month over month.
  const [weekday, dayNum, month] = dateParts(day.iso);

  return (
    <div className="day" data-open={isOpen} data-status={status}>
      <button className="day-summary" onClick={onToggle} aria-expanded={isOpen}>
        <span className="day-date" aria-hidden="true">
          <span>{weekday}</span>
          <span>{dayNum}</span>
          <span>{month}</span>
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="day-title" style={{ display: "block" }}>
            {status === "today" && <span className="today-pill">Today</span>}
            {day.title}
          </span>
          <span className="day-meta" style={{ display: "block" }}>
            {label}
            {day.drive && day.drive !== "0km" && <> · 🚗 {day.drive}</>} ·{" "}
            <span style={{ color: sleep.col }}>
              {sleep.icon} {sleep.label}
            </span>
          </span>
        </span>
        <span className="chevron" aria-hidden="true">
          ›
        </span>
      </button>

      {isOpen && (
        <div className="day-body">
          <PhotoImage
            legId={leg.id}
            dayIndex={dayIndex}
            emoji={leg.emoji}
            alt={day.title}
          />

          {day.stops.length > 0 && (
            <>
              <div className="section-label" style={{ color: leg.ac }}>
                🛑 Stops on this drive
              </div>
              <div className="stops">
                {day.stops.map((stop) => (
                  <div className="stop" key={stop.place}>
                    <div className="stop-place">
                      {stop.place} · {stop.duration}
                    </div>
                    <div className="stop-what">{stop.what}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="day-cols">
            <div>
              <div className="section-label" style={{ color: leg.ac }}>
                Highlights
              </div>
              {day.hi.map((item) => (
                <div className="hi" key={item}>
                  <span className="hi-bullet" aria-hidden="true">
                    ◆
                  </span>
                  <span>{item}</span>
                </div>
              ))}

              {day.tip && (
                <div className="callout callout-tip">
                  <div className="section-label" style={{ color: leg.ac, marginBottom: 3 }}>
                    💡 Tip
                  </div>
                  <div className="callout-body">{day.tip}</div>
                </div>
              )}

              {day.gem && (
                <div className="callout callout-gem">
                  <div className="section-label" style={{ color: "#ffd700", marginBottom: 3 }}>
                    💎 Hidden Gem
                  </div>
                  <div className="callout-body">{day.gem}</div>
                </div>
              )}
            </div>

            <div>
              <div className="section-label" style={{ color: sleep.col }}>
                {sleep.icon} Where to Sleep
              </div>
              <div
                className="bed"
                style={{ border: `1px solid ${sleep.col}33` } as CSSProperties}
              >
                <div className="bed-body">{day.bed}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Date range shown in the leg header, e.g. "9 Sep → 11 Sep". */
export function legDateRange(leg: Leg): string {
  const first = leg.days[0];
  const last = leg.days[leg.days.length - 1];
  const start = formatShort(first.iso);
  const end = formatShort(last.isoEnd ?? last.iso);
  return start === end ? start : `${start} → ${end}`;
}
