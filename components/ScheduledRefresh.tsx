"use client";

import { useEffect } from "react";

// Performs ONE hard refresh per day at a fixed local time (default 13:40)
// so every client picks up the freshest deployed version. It records the last
// refresh date in localStorage to avoid repeating within the same day.
const REFRESH_HOUR = 13;   // 24h format
const REFRESH_MINUTE = 40;
const STORAGE_KEY = "prestair-scheduled-refresh-date";

export default function ScheduledRefresh() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const check = () => {
      const now = new Date();
      const today = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC date is fine as a per-day key)

      // Only fire at/after the scheduled time, once per calendar day.
      const isAfterScheduled =
        now.getHours() > REFRESH_HOUR ||
        (now.getHours() === REFRESH_HOUR && now.getMinutes() >= REFRESH_MINUTE);

      if (!isAfterScheduled) return;

      let last = "";
      try { last = localStorage.getItem(STORAGE_KEY) || ""; } catch { /* */ }
      if (last === today) return; // already refreshed today

      // Extra guard: only auto-refresh within a small window (13:40–13:50) so a
      // machine that opens the app later in the day isn't force-reloaded mid-work.
      const withinWindow =
        now.getHours() === REFRESH_HOUR &&
        now.getMinutes() >= REFRESH_MINUTE &&
        now.getMinutes() < REFRESH_MINUTE + 10;

      if (!withinWindow) {
        // Past the window today — just mark done so we don't reload later unexpectedly.
        try { localStorage.setItem(STORAGE_KEY, today); } catch { /* */ }
        return;
      }

      try { localStorage.setItem(STORAGE_KEY, today); } catch { /* */ }
      // Hard reload to fetch the latest deployed assets.
      window.location.reload();
    };

    // Check immediately, then every 30 seconds.
    check();
    const id = window.setInterval(check, 30 * 1000);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
