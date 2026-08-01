"use client";

import { useState, useEffect, useRef } from "react";

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const menuRef = useRef<HTMLDivElement>(null);

  // Load saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("prestair-theme") as "light" | "dark" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("prestair-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Hamburger Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col items-center justify-center w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 active:scale-90 transition-all"
        aria-label="Menu"
        title="Settings"
      >
        <span className={`block w-4 h-0.5 bg-slate-600 rounded-full transition-all ${open ? "rotate-45 translate-y-1" : ""}`} />
        <span className={`block w-4 h-0.5 bg-slate-600 rounded-full mt-1 transition-all ${open ? "opacity-0" : ""}`} />
        <span className={`block w-4 h-0.5 bg-slate-600 rounded-full mt-1 transition-all ${open ? "-rotate-45 -translate-y-1" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2">
          
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Customization</p>
          </div>

          {/* Theme Toggle */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{theme === "light" ? "☀️" : "🌙"}</span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {theme === "light" ? "Light Mode" : "Dark Mode"}
                </span>
              </div>
              {/* Toggle Switch */}
              <button
                onClick={toggleTheme}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  theme === "dark" ? "bg-blue-600" : "bg-slate-300"
                }`}
                aria-label="Toggle dark mode"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    theme === "dark" ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Switch between light and dark appearance
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-slate-700" />

          {/* Info */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🏢</span>
              <span className="text-xs text-slate-600 dark:text-slate-300">Prestair Systems LLP</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base">📍</span>
              <span className="text-xs text-slate-600 dark:text-slate-300">B-127, Noida, UP</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <span className="text-xs text-slate-600 dark:text-slate-300">Quotation Dashboard v1.0</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
