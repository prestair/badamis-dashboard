"use client";

import { useEffect } from "react";

export default function PwaInstall() {
  useEffect(() => {
    // Register service worker for offline caching
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
