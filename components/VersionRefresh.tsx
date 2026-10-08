"use client";

import { useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// VersionRefresh — FULLY AUTOMATIC, no manual work needed.
//
// Forces ONE hard reload per client whenever a NEW build is deployed.
//
// How it works:
//  - The build version comes from NEXT_PUBLIC_APP_BUILD_ID, which is set
//    automatically at build time in next.config.js:
//       • On Vercel  → the git commit SHA (changes on EVERY push/deploy)
//       • Locally    → a build timestamp
//    So you NEVER have to bump a version by hand — every deploy is a new id.
//  - On mount we compare the current build id with the one stored in
//    localStorage. If they differ (first load after a new deploy) we store the
//    new id and hard-reload ONCE so the client fetches the freshest bundles.
//  - Storing the new id BEFORE reloading means it fires exactly once per
//    deploy per device — never a reload loop.
// ─────────────────────────────────────────────────────────────────────────────

const BUILD_ID = process.env.NEXT_PUBLIC_APP_BUILD_ID || "dev";
const STORAGE_KEY = "prestair-app-build-id";

export default function VersionRefresh() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let stored = "";
    try { stored = localStorage.getItem(STORAGE_KEY) || ""; } catch { /* */ }

    // First visit ever on this device — just record the build id, don't reload.
    if (!stored) {
      try { localStorage.setItem(STORAGE_KEY, BUILD_ID); } catch { /* */ }
      return;
    }

    // Build changed since last visit → store new id, then hard reload once.
    if (stored !== BUILD_ID) {
      try { localStorage.setItem(STORAGE_KEY, BUILD_ID); } catch { /* */ }
      window.location.reload();
    }
  }, []);

  return null;
}
