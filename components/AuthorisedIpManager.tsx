"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";

type IpEntry = {
  id: string;
  ip_address: string;
  label: string | null;
  created_at: string;
};

type Notice = { text: string; error: boolean };

const focusableSelector = [
  "button:not([disabled])",
  "input:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function AuthorisedIpManager({ onClose }: { onClose: () => void }) {
  const { loggedRole } = useAuth();
  const [entries, setEntries] = useState<IpEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [newIp, setNewIp] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => { document.body.style.overflow = prev; };
  }, []);

  function handleDialogKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/authorised-ips", { headers: { "x-user-role": "admin" } });
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch { showNotice("Failed to load authorised IPs.", true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (loggedRole === "admin") loadEntries(); }, [loggedRole, loadEntries]);

  function showNotice(text: string, error = false) {
    setNotice({ text, error });
    window.setTimeout(() => setNotice(null), 4000);
  }

  async function addIp() {
    const ip = newIp.trim();
    if (!ip) { showNotice("IP address is required.", true); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/authorised-ips", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": "admin" },
        body: JSON.stringify({ ipAddress: ip, label: newLabel.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) { showNotice(data.error ?? "Failed to add IP.", true); return; }
      setEntries((prev) => [data, ...prev]);
      setNewIp(""); setNewLabel("");
      showNotice(`IP ${data.ip_address} added.`);
    } catch { showNotice("Network error.", true); }
    finally { setSaving(false); }
  }

  async function deleteIp(id: string) {
    if (confirmDelete !== id) { setConfirmDelete(id); return; }
    try {
      const res = await fetch(`/api/authorised-ips?id=${id}`, {
        method: "DELETE", headers: { "x-user-role": "admin" },
      });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
        showNotice("IP removed.");
      } else {
        const data = await res.json();
        showNotice(data.error ?? "Failed to remove.", true);
      }
    } catch { showNotice("Network error.", true); }
    finally { setConfirmDelete(null); }
  }

  function fmtDate(iso: string) {
    try {
      return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
    } catch { return iso; }
  }

  const shell = loggedRole !== "admin" ? null : (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog" aria-modal="true" aria-labelledby="auth-ip-title"
        onKeyDown={handleDialogKeyDown}
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-4 px-5 py-4" style={{ background: "linear-gradient(135deg,#0f172a,#1e3a5f,#2563eb)" }}>
          <div>
            <h2 id="auth-ip-title" className="text-base font-bold text-white">Authorised IP Addresses</h2>
            <p className="text-xs text-blue-200">Only listed IPs can login. Empty list = no restriction.</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose}
            className="rounded-lg px-2.5 py-1.5 text-xl text-white/75 hover:bg-white/10 hover:text-white focus:outline-none">✕</button>
        </header>

        {/* Add form */}
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={newIp} onChange={(e) => setNewIp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void addIp()}
              placeholder="IP Address (e.g. 103.170.81.68)"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <input
              value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void addIp()}
              placeholder="Label (optional, e.g. Office)"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button type="button" onClick={() => void addIp()} disabled={saving || !newIp.trim()}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              Add IP
            </button>
          </div>
        </div>

        {/* Notice */}
        {notice && (
          <p role={notice.error ? "alert" : "status"}
            className={`mx-4 mt-3 flex-shrink-0 rounded-lg border px-4 py-2 text-sm ${notice.error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
            {notice.text}
          </p>
        )}

        {/* IP list */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-8 text-center text-slate-400">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
              <strong>No IP restrictions active.</strong> All IP addresses are currently allowed to login. Add an IP above to start restricting access.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-2">IP Address</th>
                    <th className="border-b border-slate-200 px-4 py-2">Label</th>
                    <th className="border-b border-slate-200 px-4 py-2">Added On</th>
                    <th className="border-b border-slate-200 px-4 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono font-semibold text-slate-800">{entry.ip_address}</td>
                      <td className="px-4 py-2 text-slate-600">{entry.label || <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">{fmtDate(entry.created_at)}</td>
                      <td className="px-4 py-2 text-center">
                        <button type="button" onClick={() => void deleteIp(entry.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            confirmDelete === entry.id ? "bg-red-600 text-white" : "bg-red-50 text-red-600 hover:bg-red-100"
                          }`}>
                          {confirmDelete === entry.id ? "Confirm?" : "Remove"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-slate-100 bg-slate-50 px-5 py-2 text-xs text-slate-500">
          {entries.length} authorised IP{entries.length !== 1 ? "s" : ""}
          {entries.length > 0 && " · Only these IPs can login"}
        </div>
      </div>
    </div>
  );

  return shell ? createPortal(shell, document.body) : null;
}
