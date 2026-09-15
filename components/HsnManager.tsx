"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";

export type HsnEntry = {
  id: string;
  code: string;
  description: string;
  created_at?: string;
};

type Notice = { message: string; error: boolean };

export default function HsnManager({ onClose }: { onClose: () => void }) {
  const { loggedRole } = useAuth();
  const isAdmin = loggedRole === "admin";
  const [entries, setEntries] = useState<HsnEntry[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hsn-codes", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to load HSN codes.");
      setEntries(Array.isArray(data) ? data : []);
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : "Unable to load HSN codes.", error: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
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
  }, [load, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.code.toLowerCase().includes(q) || (e.description || "").toLowerCase().includes(q));
  }, [entries, query]);

  function showNotice(message: string, error = false) {
    setNotice({ message, error });
    window.setTimeout(() => setNotice((cur) => cur?.message === message ? null : cur), 3000);
  }

  async function addEntry() {
    const code = newCode.trim();
    if (!code) { showNotice("Enter an HSN code.", true); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/hsn-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": loggedRole ?? "" },
        body: JSON.stringify({ code, description: newDesc.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to add.");
      setEntries((cur) => [...cur, data].sort((a, b) => a.code.localeCompare(b.code)));
      setNewCode(""); setNewDesc("");
      showNotice(`Added HSN ${data.code}.`);
    } catch (e) {
      showNotice(e instanceof Error ? e.message : "Unable to add.", true);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(entry: HsnEntry) {
    setEditingId(entry.id);
    setEditCode(entry.code);
    setEditDesc(entry.description || "");
    setNotice(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    const code = editCode.trim();
    if (!code) { showNotice("HSN code cannot be empty.", true); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/hsn-codes/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-role": loggedRole ?? "" },
        body: JSON.stringify({ code, description: editDesc.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to update.");
      setEntries((cur) => cur.map((e) => e.id === editingId ? data : e).sort((a, b) => a.code.localeCompare(b.code)));
      setEditingId(null); setEditCode(""); setEditDesc("");
      showNotice(`Updated HSN ${data.code}.`);
    } catch (e) {
      showNotice(e instanceof Error ? e.message : "Unable to update.", true);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id: string, code: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      window.setTimeout(() => setConfirmDeleteId((cur) => cur === id ? null : cur), 3000);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/hsn-codes/${id}`, {
        method: "DELETE",
        headers: { "x-user-role": loggedRole ?? "" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Unable to delete.");
      }
      setEntries((cur) => cur.filter((e) => e.id !== id));
      setConfirmDeleteId(null);
      showNotice(`Deleted HSN ${code}.`);
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
        aria-labelledby="hsn-manager-title"
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white text-slate-800 shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
          style={{ background: "linear-gradient(135deg,#0f172a,#1e3a5f,#2563eb)" }}>
          <div>
            <h2 id="hsn-manager-title" className="text-lg font-bold text-white">HSN Code Management</h2>
            <p className="text-xs text-blue-200">These codes appear in the HSN dropdown when creating a quotation.</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close"
            className="rounded-lg px-2.5 py-1.5 text-xl text-white/75 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60">
            ×
          </button>
        </header>

        {/* Add form — available to any logged-in user */}
        <div className="border-b border-slate-200 bg-slate-50 p-4 sm:px-6">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Add HSN Code</label>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void addEntry()}
              maxLength={40}
              placeholder="HSN code, e.g. 8419"
              className="w-full sm:w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void addEntry()}
              maxLength={200}
              placeholder="Description (optional)"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button type="button" onClick={() => void addEntry()}
              disabled={saving || !newCode.trim()}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              Add
            </button>
          </div>
          {!isAdmin && (
            <p className="mt-1.5 text-[10px] text-slate-400">You can add and edit HSN codes. Deleting is restricted to admins.</p>
          )}
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
            <p className="text-sm font-semibold text-slate-700">HSN Codes ({entries.length})</p>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search code or description…"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 w-32">HSN Code</th>
                  <th className="border-b border-slate-200 px-4 py-3">Description</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-center w-40">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">No HSN codes found.</td></tr>
                ) : filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-blue-50/60">
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">
                      {editingId === entry.id ? (
                        <input autoFocus value={editCode} onChange={(e) => setEditCode(e.target.value)}
                          maxLength={40}
                          className="w-full rounded border border-blue-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                      ) : entry.code}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {editingId === entry.id ? (
                        <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") void saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                          maxLength={200}
                          className="w-full rounded border border-blue-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                      ) : (entry.description || "—")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingId === entry.id ? (
                        <div className="flex justify-center gap-2">
                          <button type="button" onClick={() => void saveEdit()} disabled={saving} className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Save</button>
                          <button type="button" onClick={() => setEditingId(null)} className="rounded bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-300">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-2">
                          <button type="button" onClick={() => startEdit(entry)} className="rounded bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100">Edit</button>
                          {isAdmin && (
                            <button type="button" onClick={() => void deleteEntry(entry.id, entry.code)} disabled={saving}
                              className={`rounded px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                                confirmDeleteId === entry.id ? "bg-red-600 text-white" : "bg-red-50 text-red-600 hover:bg-red-100"
                              }`}>
                              {confirmDeleteId === entry.id ? "Confirm" : "Delete"}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );

  return createPortal(shell, document.body);
}
