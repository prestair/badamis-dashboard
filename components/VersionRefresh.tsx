"use client";

import { useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// VersionRefresh
// Forces ONE hard reload per client whenever a NEW app version is deployed.
//
// How it works:
//  - APP_VERSION is bumped on every deploy that needs a forced refresh.
//  - On mount we compare APP_VERSION against the value stored in localStorage.
//  - If they differ (first load after a new deploy), we store the new version
//    and hard-reload once so the client fetches the freshest JS/CSS bundles.
//  - Because we store the new version BEFORE reloading, it fires exactly once
//    per version per device — never a reload loop.
//
// To force everyone to refresh on the next load, bump APP_VERSION below.
// ─────────────────────────────────────────────────────────────────────────────

const APP_VERSION = "2026.10.08-dimension-columns";
const STORAGE_KEY = "prestair-app-version";

export default function VersionRefresh() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let stored = "";
    try { stored = localStorage.getItem(STORAGE_KEY) || ""; } catch { /* */ }

    // First visit ever on this device — just record the version, don't reload.
    if (!stored) {
      try { localStorage.setItem(STORAGE_KEY, APP_VERSION); } catch { /* */ }
      return;
    }

    // Version changed since last visit → store new version, then hard reload once.
    if (stored !== APP_VERSION) {
      try { localStorage.setItem(STORAGE_KEY, APP_VERSION); } catch { /* */ }
      // Reload to pick up the newly deployed assets.
      window.location.reload();
    }
  }, []);

  return null;
}
