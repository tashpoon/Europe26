"use client";

import { useMemo, useState } from "react";
import type { Todo, Urgency } from "@/lib/types";
import { TODOS } from "@/lib/data/todos";
import { TODO_CATEGORIES, URGENCY } from "@/lib/constants";
import { formatShort, formatWithYear, isOverdue } from "@/lib/dates";
import {
  addCustom,
  customList,
  doneMap,
  removeCustom,
  setDone as setDoneIn,
  type TripState,
} from "@/lib/syncState";
import { SyncBar } from "./SyncBar";
import type { SyncStatus } from "@/lib/useTripState";

const BLANK = {
  item: "",
  cat: "📋 Admin",
  urgency: "later" as Urgency,
  bookBy: "",
  tripDate: "",
  notes: "",
  url: "",
};

export function ChecklistTab({
  today,
  state,
  update,
  sync,
}: {
  today: string;
  state: TripState;
  update: (change: (current: TripState) => TripState) => void;
  sync: {
    status: SyncStatus;
    lastSync: number | null;
    connect: (key: string) => void;
    disconnect: () => void;
  };
}) {
  const [filterUrgency, setFilterUrgency] = useState<Urgency | "all">("all");
  const [filterCat, setFilterCat] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [draft, setDraft] = useState(BLANK);

  const done = useMemo(() => doneMap(state), [state]);
  const custom = useMemo(() => customList(state), [state]);
  const all = useMemo(() => [...TODOS, ...custom], [custom]);

  const isDone = (todo: Todo) => done[todo.id] === true || todo.urgency === "done";

  const counts = all.reduce<Record<string, number>>((acc, todo) => {
    acc[todo.urgency] = (acc[todo.urgency] ?? 0) + 1;
    return acc;
  }, {});

  const overdueCount = all.filter((t) => isOverdue(t.bookBy, today, isDone(t))).length;
  const doneCount = all.filter(isDone).length;

  const categories = ["all", ...Array.from(new Set(all.map((t) => t.cat)))];

  const filtered = all.filter(
    (t) =>
      (filterUrgency === "all" || t.urgency === filterUrgency) &&
      (filterCat === "all" || t.cat === filterCat),
  );

  const toggle = (id: string) => update((s) => setDoneIn(s, id, !done[id]));

  const add = () => {
    if (!draft.item.trim()) return;
    const todo: Todo = {
      // Random suffix so two phones adding a task in the same millisecond
      // don't collide on the shared list.
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      item: draft.item.trim(),
      cat: draft.cat,
      urgency: draft.urgency,
      bookBy: draft.bookBy || null,
      tripDate: draft.tripDate || null,
      notes: draft.notes,
      url: draft.url,
      custom: true,
    };
    update((s) => addCustom(s, todo));
    setDraft(BLANK);
    setShowAdd(false);
  };

  const remove = (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    update((s) => removeCustom(s, id));
    setConfirmDelete(null);
  };

  return (
    <div className="checklist">
      <SyncBar
        status={sync.status}
        lastSync={sync.lastSync}
        onConnect={sync.connect}
        onDisconnect={sync.disconnect}
      />

      <div className="progress-head">
        <span>Overall progress</span>
        <span>
          {doneCount}/{all.length} done
          {overdueCount > 0 && (
            <span style={{ color: "#ff9090" }}> · {overdueCount} overdue</span>
          )}
        </span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${(doneCount / all.length) * 100}%` }}
        />
      </div>

      <div className="tiles">
        {(Object.keys(URGENCY) as Urgency[]).map((key) => {
          const conf = URGENCY[key];
          const dimmed = filterUrgency !== "all" && filterUrgency !== key;
          return (
            <button
              key={key}
              className="tile"
              onClick={() => setFilterUrgency(filterUrgency === key ? "all" : key)}
              style={{
                background: conf.bg,
                border: `1px solid ${conf.border}`,
                opacity: dimmed ? 0.4 : 1,
              }}
            >
              <span className="tile-dot" style={{ background: conf.dot, display: "block" }} />
              <span className="tile-num" style={{ color: conf.text, display: "block" }}>
                {counts[key] ?? 0}
              </span>
              <span className="tile-label" style={{ color: conf.text, display: "block" }}>
                {conf.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="cats">
        {categories.map((cat) => (
          <button
            key={cat}
            className="cat"
            aria-pressed={filterCat === cat}
            onClick={() => setFilterCat(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <button
        className="add-toggle"
        aria-expanded={showAdd}
        onClick={() => setShowAdd(!showAdd)}
      >
        <span style={{ fontSize: 16 }}>{showAdd ? "✕" : "+"}</span>
        <span>{showAdd ? "Cancel" : "Add a task"}</span>
      </button>

      {showAdd && (
        <div className="add-form">
          <div className="add-grid">
            <div className="field field-wide">
              <label htmlFor="new-item">Task name *</label>
              <input
                id="new-item"
                placeholder="e.g. Book train tickets"
                value={draft.item}
                onChange={(e) => setDraft({ ...draft, item: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="new-cat">Category</label>
              <select
                id="new-cat"
                value={draft.cat}
                onChange={(e) => setDraft({ ...draft, cat: e.target.value })}
              >
                {TODO_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="new-urgency">Urgency</label>
              <select
                id="new-urgency"
                value={draft.urgency}
                onChange={(e) =>
                  setDraft({ ...draft, urgency: e.target.value as Urgency })
                }
              >
                <option value="now">🔴 Book NOW</option>
                <option value="soon">🟡 Book Soon</option>
                <option value="later">🟢 Book Later</option>
                <option value="done">✅ Done</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="new-bookby">Book by</label>
              <input
                id="new-bookby"
                type="date"
                value={draft.bookBy}
                onChange={(e) => setDraft({ ...draft, bookBy: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="new-tripdate">Trip date</label>
              <input
                id="new-tripdate"
                type="date"
                value={draft.tripDate}
                onChange={(e) => setDraft({ ...draft, tripDate: e.target.value })}
              />
            </div>
            <div className="field field-wide">
              <label htmlFor="new-notes">Notes</label>
              <input
                id="new-notes"
                placeholder="Any extra info"
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </div>
            <div className="field field-wide">
              <label htmlFor="new-url">Link (optional)</label>
              <input
                id="new-url"
                placeholder="e.g. booking.com"
                value={draft.url}
                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              />
            </div>
          </div>
          <button className="btn-primary" onClick={add} disabled={!draft.item.trim()}>
            Add to checklist
          </button>
        </div>
      )}

      {(Object.keys(URGENCY) as Urgency[]).map((key) => {
        const conf = URGENCY[key];
        const items = filtered.filter((t) => t.urgency === key);
        if (items.length === 0) return null;

        return (
          <div className="group" key={key}>
            <div className="group-head">
              <span className="tile-dot" style={{ background: conf.dot, margin: 0 }} />
              <span className="group-title" style={{ color: conf.text }}>
                {conf.label}
              </span>
              <span className="group-rule" style={{ background: conf.border }} />
              <span style={{ fontSize: 9, color: conf.text }}>{items.length}</span>
            </div>

            {items.map((todo) => {
              const ticked = isDone(todo);
              const overdue = isOverdue(todo.bookBy, today, ticked);
              const confirming = confirmDelete === todo.id;

              return (
                <div
                  className="todo"
                  key={todo.id}
                  data-done={ticked}
                  style={{
                    background: conf.bg,
                    border: `1px solid ${confirming ? "#e05555" : conf.border}`,
                  }}
                >
                  <button
                    className="tick"
                    onClick={() => toggle(todo.id)}
                    aria-label={ticked ? `Mark "${todo.item}" undone` : `Mark "${todo.item}" done`}
                    style={{ border: `1.5px solid ${ticked ? "#4ecdc4" : conf.dot}` }}
                  >
                    {ticked ? "✓" : ""}
                  </button>

                  <div className="todo-main">
                    <div className="todo-top">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="todo-cat" style={{ color: conf.text }}>
                          {todo.cat}
                        </div>
                        <div className="todo-item">{todo.item}</div>
                      </div>

                      <div className="todo-dates">
                        {todo.bookBy && (
                          <div
                            className={`datebox${overdue ? " overdue" : ""}`}
                            style={overdue ? undefined : { border: `1px solid ${conf.border}` }}
                          >
                            <div className="datebox-label" style={{ color: conf.text }}>
                              {overdue ? "Overdue" : "Book by"}
                            </div>
                            <div className="datebox-value" style={{ color: conf.text }}>
                              {formatWithYear(todo.bookBy)}
                            </div>
                          </div>
                        )}
                        {todo.tripDate && (
                          <div className="datebox datebox-trip">
                            <div className="datebox-label">Trip date</div>
                            <div className="datebox-value">{formatShort(todo.tripDate)}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {todo.notes && <div className="todo-notes">{todo.notes}</div>}

                    {todo.url && todo.urgency !== "done" && (
                      <a
                        className="todo-link"
                        href={`https://${todo.url.replace(/^https?:\/\//, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: conf.dot }}
                      >
                        🔗 {todo.url}
                      </a>
                    )}

                    {todo.custom && (
                      <div>
                        <button
                          className="btn-remove"
                          data-confirming={confirming}
                          onClick={() => remove(todo.id)}
                        >
                          {confirming ? "Tap again to delete" : "× Remove"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {filtered.length === 0 && <p className="empty">Nothing matches those filters.</p>}
    </div>
  );
}
