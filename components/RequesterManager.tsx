"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";

export type RequesterEntry = {
  id: string;
  name: string;
  created_at?: string;
};

type Notice = { message: string; error: boolean };

export default function RequesterManager({ onClose }: { onClose: () => void }) {
  const { loggedRole } = useAuth();
  const [entries, setEntries] = useState<RequesterEntry[]>([]);
  const [newName, setNewName] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/requesters", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to load requesters.");
      setEntries(Array.isArray(data) ? data : []);
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : "Unable to load requesters.", error: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [loadEntries, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.name.toLowerCase().includes(q));
  }, [entries, query]);

  function showNotice(message: string, error = false) {
    setNotice({ message, error });
    window.setTimeout(() => setNotice((cur) => cur?.message === message ? null : cur), 3000);
  }

  async function addRequester() {
    const name = newName.trim();
    if (!name) { showNotice("Enter a name.", true); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/requesters", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": loggedRole ?? "" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to add.");
      setEntries((cur) => [...cur, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      showNotice(`Added "${data.name}".`);
    } catch (e) {
      showNotice(e instanceof Error ? e.message : "Unable to add.", true);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRequester(id: string, name: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      window.setTimeout(() => setConfirmDeleteId((cur) => cur === id ? null : cur), 3000);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/requesters/${id}`, {
        method: "DELETE",
        headers: { "x-user-role": loggedRole ?? "" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Unable to delete.");
      }
      setEntries((cur) => cur.filter((e) => e.id !== id));
      setConfirmDeleteId(null);
      showNotice(`Deleted "${name}".`);
    } catch (e) {
      showNotice(e instanceof Error ? e.message : "Unable to delete.", true);
    } finally {
      setSaving(false);
    }
  }

  const shell = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="requester-manager-title"
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white text-slate-800 shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
          style={{ background: "linear-gradient(135deg,#0f172a,#1e3a5f,#2563eb)" }}>
          <div>
            <h2 id="requester-manager-title" className="text-lg font-bold text-white">Requester Management</h2>
            <p className="text-xs text-blue-200">Names shown in the Requester dropdown when creating a quotation.</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close"
            className="rounded-lg px-2.5 py-1.5 text-xl text-white/75 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60">
            ×
          </button>
        </header>

        {loggedRole !== "admin" ? (
          <div className="p-8 text-center">
            <h3 className="font-bold text-slate-800">Admin access required</h3>
            <p className="mt-2 text-sm text-slate-500">Only administrators can manage requesters.</p>
          </div>
        ) : (
          <>
            {/* Add form */}
            <div className="border-b border-slate-200 bg-slate-50 p-4 sm:px-6">
              <label htmlFor="new-requester-name" className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Add Requester
              </label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                <input
                  id="new-requester-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void addRequester()}
                  maxLength={200}
                  placeholder="Full name, e.g. Amit Sharma"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <button type="button" onClick={() => void addRequester()}
                  disabled={saving || !newName.trim()}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  Add
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-slate-400">
                Initials (first letters of first &amp; last name) will be appended to the Quotation No. automatically.
              </p>
            </div>

            {notice && (
              <p role={notice.error ? "alert" : "status"}
                className={`mx-4 mt-3 rounded-lg border px-4 py-2 text-sm sm:mx-6 ${
                  notice.error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"
                }`}>
                {notice.message}
              </p>
            )}

            {/* List */}
            <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-700">
                  Requesters ({entries.length})
                </p>
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="border-b border-slate-200 px-4 py-3">Name</th>
                      <th className="border-b border-slate-200 px-4 py-3 text-center w-20">Initials</th>
                      <th className="border-b border-slate-200 px-4 py-3 text-center w-32">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">No requesters found.</td></tr>
                    ) : filtered.map((entry) => {
                      const initials = getRequesterInitials(entry.name);
                      return (
                        <tr key={entry.id} className="hover:bg-blue-50/60">
                          <td className="px-4 py-3 font-medium">{entry.name}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 font-mono">
                              {initials}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button type="button"
                              onClick={() => void deleteRequester(entry.id, entry.name)}
                              disabled={saving}
                              className={`rounded px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                                confirmDeleteId === entry.id
                                  ? "bg-red-600 text-white"
                                  : "bg-red-50 text-red-600 hover:bg-red-100"
                              }`}>
                              {confirmDeleteId === entry.id ? "Confirm Delete" : "Delete"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );

  return createPortal(shell, document.body);
}

// Export so QuotationModal can reuse
export function getRequesterInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
