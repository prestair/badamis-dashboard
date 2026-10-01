"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";

type LoginActivityRecord = {
  id:           string;
  username:     string;
  logged_in_at: string;
  ip_address:   string | null;
  device_info:  string | null;
  latitude:     number | null;
  longitude:    number | null;
  gps_accuracy: number | null;
  gps_error:    string | null;
  city:         string | null;
};

type Notice = { text: string; error: boolean };

const focusableSelector = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function LoginActivityAdmin({ onClose }: { onClose: () => void }) {
  const { loggedRole } = useAuth();
  const [records, setRecords] = useState<LoginActivityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // ── Focus management & cleanup ────────────────────────────────────────────
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;

    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // Wait until role is resolved — load as soon as admin is confirmed
    if (loggedRole === "admin") {
      loadRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedRole]);

  // Also load immediately on mount if role is already known
  useEffect(() => {
    if (loggedRole === "admin") loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRecords() {
    setLoading(true);
    try {
      const res = await fetch("/api/login-activity", {
        headers: { "x-user-role": "admin" },
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data) ? data : []);
      } else {
        showNotice("Failed to load login activity data.", true);
      }
    } catch {
      showNotice("Network error loading login activity.", true);
    } finally {
      setLoading(false);
    }
  }

  // ── Utils ──────────────────────────────────────────────────────────────────
  function showNotice(text: string, error = false) {
    setNotice({ text, error });
    window.setTimeout(() => {
      setNotice((current) => current?.text === text ? null : current);
    }, 4000);
  }

  function formatDateTime(isoString: string): string {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  }

  function formatDevice(deviceInfo: string | null): string {
    if (!deviceInfo) return "—";
    // Extract browser/OS from user agent (simple heuristic)
    const ua = deviceInfo.toLowerCase();
    let browser = "Unknown";
    let os = "Unknown";

    if (ua.includes("edg/")) browser = "Edge";
    else if (ua.includes("chrome") && !ua.includes("edg")) browser = "Chrome";
    else if (ua.includes("firefox")) browser = "Firefox";
    else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
    else if (ua.includes("opera") || ua.includes("opr/")) browser = "Opera";

    if (ua.includes("windows")) os = "Windows";
    else if (ua.includes("mac")) os = "macOS";
    else if (ua.includes("linux")) os = "Linux";
    else if (ua.includes("android")) os = "Android";
    else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

    return `${browser} on ${os}`;
  }

  function formatLocation(lat: number | null, lng: number | null, accuracy: number | null, error: string | null, city: string | null) {
    if (error) return <span className="text-amber-600 text-xs">Error: {error}</span>;
    if (city) {
      const accuracyText = accuracy ? ` (±${Math.round(accuracy)}m)` : "";
      const googleMapsUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;
      return (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-700">📍 {city}{accuracyText}</div>
          {googleMapsUrl && (
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              View on Map
            </a>
          )}
        </div>
      );
    }
    if (lat === null || lng === null) return <span className="text-slate-400 text-xs">No GPS</span>;
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    return (
      <div className="space-y-1">
        <div className="text-xs text-slate-600 font-mono">{lat.toFixed(5)}, {lng.toFixed(5)}</div>
        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          View on Map
        </a>
      </div>
    );
  }

  // ── Delete record ─────────────────────────────────────────────────────────
  async function handleDelete(recordId: string) {
    if (confirmDelete !== recordId) {
      setConfirmDelete(recordId);
      return;
    }

    try {
      const res = await fetch(`/api/login-activity?id=${recordId}`, {
        method: "DELETE",
        headers: { "x-user-role": "admin" },
      });
      if (res.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== recordId));
        showNotice("Login record deleted.");
      } else {
        const data = await res.json();
        showNotice(data.error ?? "Failed to delete record.", true);
      }
    } catch {
      showNotice("Network error deleting record.", true);
    } finally {
      setConfirmDelete(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loggedRole !== "admin") {
    return null;
  }

  const shell = (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        id="login-activity-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-activity-title"
        onKeyDown={handleDialogKeyDown}
        className="flex max-h-[92dvh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between px-5 py-4 sm:px-6" style={{ background: "linear-gradient(135deg,#0f172a,#1e3a5f,#2563eb)" }}>
          <div>
            <h2 id="login-activity-title" className="text-base font-bold text-white sm:text-lg">Login Activity</h2>
            <p className="text-xs text-blue-200">Security monitoring · Prestair Systems</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg px-2.5 py-1.5 text-xl text-white/75 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
            aria-label="Close login activity"
          >
            ✕
          </button>
        </div>

        {/* Notice */}
        {notice && (
          <div
            role={notice.error ? "alert" : "status"}
            aria-live="polite"
            className={`mx-5 mt-4 flex-shrink-0 rounded-lg border px-4 py-2 text-sm sm:mx-6 ${
              notice.error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {notice.text}
          </div>
        )}

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="text-slate-600">Loading login activity...</span>
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-slate-500 text-lg">No login activity found</p>
              <p className="text-slate-400 text-sm mt-2">Login records will appear here once users sign in</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="max-h-[60dvh] overflow-auto">
                <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
                  <caption className="sr-only">Login activity records</caption>
                  <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="border-b border-slate-200 px-4 py-3 w-32">Date & Time</th>
                      <th scope="col" className="border-b border-slate-200 px-4 py-3 w-24">Username</th>
                      <th scope="col" className="border-b border-slate-200 px-4 py-3 w-32">IP Address</th>
                      <th scope="col" className="border-b border-slate-200 px-4 py-3 w-40">Device / Browser</th>
                      <th scope="col" className="border-b border-slate-200 px-4 py-3 w-48">Location</th>
                      <th scope="col" className="border-b border-slate-200 px-4 py-3 w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {records.map((record) => (
                      <tr key={record.id} className="align-top hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <time className="text-slate-700 font-medium">
                            {formatDateTime(record.logged_in_at)}
                          </time>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-slate-600">@{record.username}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-slate-600 text-xs">
                            {record.ip_address || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-600 text-xs">
                            {formatDevice(record.device_info)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {formatLocation(record.latitude, record.longitude, record.gps_accuracy, record.gps_error, record.city)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleDelete(record.id)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                              confirmDelete === record.id
                                ? "bg-red-600 text-white"
                                : "bg-red-50 text-red-600 hover:bg-red-100"
                            }`}
                            title={confirmDelete === record.id ? "Click again to confirm deletion" : "Delete this login record"}
                          >
                            {confirmDelete === record.id ? "Confirm?" : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500 sm:px-6">
          Total {records.length} login records
        </div>
      </div>
    </div>
  );

  return createPortal(shell, document.body);
}