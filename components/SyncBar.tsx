"use client";

import { useState } from "react";
import type { SyncStatus } from "@/lib/useTripState";

function relative(at: number | null): string {
  if (!at) return "";
  const secs = Math.round((Date.now() - at) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

const TONE: Record<SyncStatus, { dot: string; text: string }> = {
  off: { dot: "#4a7080", text: "#4a7080" },
  syncing: { dot: "#e09030", text: "#ffcc70" },
  synced: { dot: "#50c050", text: "#90e090" },
  offline: { dot: "#e09030", text: "#ffcc70" },
  "bad-key": { dot: "#e05555", text: "#ff9090" },
  unconfigured: { dot: "#e05555", text: "#ff9090" },
};

export function SyncBar({
  status,
  lastSync,
  onConnect,
  onDisconnect,
}: {
  status: SyncStatus;
  lastSync: number | null;
  onConnect: (key: string) => void;
  onDisconnect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const message: Record<SyncStatus, string> = {
    off: "Ticks save on this device only",
    syncing: "Syncing…",
    synced: `Shared with your partner · ${relative(lastSync)}`,
    offline: "Offline — ticks saved here, will sync when you're back",
    "bad-key": "That code didn't match — try again",
    unconfigured: "Sharing isn't set up on this deployment yet",
  };

  const submit = () => {
    onConnect(value);
    setValue("");
    setOpen(false);
  };

  return (
    <div className="syncbar">
      <div className="syncbar-row">
        <span className="sync-dot" style={{ background: TONE[status].dot }} />
        <span className="sync-msg" style={{ color: TONE[status].text }}>
          {message[status]}
        </span>

        {status === "off" || status === "bad-key" ? (
          <button className="sync-btn" onClick={() => setOpen(!open)}>
            {open ? "Cancel" : "Share with partner"}
          </button>
        ) : status === "unconfigured" ? null : (
          <button className="sync-btn" onClick={onDisconnect}>
            Stop sharing
          </button>
        )}
      </div>

      {open && (
        <form
          className="sync-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="trip-key">
            Enter the trip code — same one on both phones
          </label>
          <div className="sync-form-row">
            <input
              id="trip-key"
              type="password"
              autoComplete="off"
              placeholder="trip code"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <button className="btn-primary" type="submit" disabled={!value.trim()}>
              Connect
            </button>
          </div>
        </form>
      )}

      {status === "unconfigured" && (
        <p className="sync-help">
          Connect a database in the Vercel dashboard — <code>DATABASE_URL</code>{" "}
          for Neon Postgres, or <code>KV_REST_API_URL</code> for Upstash Redis —
          and set a <code>TRIP_PASSPHRASE</code>, then redeploy. Until then
          everything still works; ticks just stay on this device.
        </p>
      )}
    </div>
  );
}
