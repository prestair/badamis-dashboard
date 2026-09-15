"use client";

import { useEffect } from "react";

// Makes the Enter key behave like Tab across the whole app: pressing Enter in a
// form field moves focus to the next focusable control instead of submitting.
// Exceptions: textarea (Enter = newline), buttons/links/selects (Enter = activate),
// and elements that opt out via data-enter-default.
export default function EnterAsTab() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const selector = [
      "input:not([disabled]):not([type=hidden])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "button:not([disabled])",
      "[href]",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
      const el = e.target as HTMLElement | null;
      if (!el) return;

      const tag = el.tagName.toLowerCase();
      // Let textarea keep Enter as newline
      if (tag === "textarea") return;
      // Let buttons / links / selects use Enter to activate/open
      if (tag === "button" || tag === "a" || tag === "select") return;
      // Opt-out hook
      if (el.getAttribute("data-enter-default") === "true") return;
      // Only act on real form inputs
      if (tag !== "input") return;

      // Find all focusable elements in DOM order and move to the next one
      const focusables = Array.from(document.querySelectorAll<HTMLElement>(selector))
        .filter((node) => node.offsetParent !== null || node === el); // visible only
      const idx = focusables.indexOf(el);
      if (idx === -1) return;

      e.preventDefault();
      const next = focusables[idx + 1];
      if (next) {
        next.focus();
        // Select text in text-like inputs for quick overwrite
        if (next instanceof HTMLInputElement && /text|search|tel|url|email|number/.test(next.type)) {
          try { next.select(); } catch { /* */ }
        }
      } else {
        el.blur();
      }
    };

    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, []);

  return null;
}
