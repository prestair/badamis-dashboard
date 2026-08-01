"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";

type ItemNameEntry = {
  id: string;
  item_name: string;
  created_at?: string;
  updated_at?: string;
};

type Notice = { message: string; error: boolean };

export default function ItemNameManager({ onClose }: { onClose: () => void }) {
  const { loggedRole } = useAuth();
  const [entries, setEntries] = useState<ItemNameEntry[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/quotation-item-names", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load Item Names.");
      setEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : "Unable to load Item Names.",
        error: true,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [loadEntries, onClose]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return entries;
    return entries.filter((entry) => entry.item_name.toLocaleLowerCase().includes(normalizedQuery));
  }, [entries, query]);

  function showNotice(message: string, error = false) {
    setNotice({ message, error });
  }

  async function addItemName() {
    const itemName = newItemName.trim();
    if (!itemName) {
      showNotice("Enter an Item Name.", true);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/quotation-item-names", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": loggedRole ?? "",
        },
        body: JSON.stringify({ itemName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to add Item Name.");
      setEntries((current) => [...current, data].sort((a, b) => a.item_name.localeCompare(b.item_name)));
      setNewItemName("");
      showNotice(`Added “${data.item_name}”.`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to add Item Name.", true);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(entry: ItemNameEntry) {
    setEditingId(entry.id);
    setEditingValue(entry.item_name);
    setNotice(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    const itemName = editingValue.trim();
    if (!itemName) {
      showNotice("Item Name cannot be empty.", true);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/quotation-item-names/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": loggedRole ?? "",
        },
        body: JSON.stringify({ itemName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to update Item Name.");
      setEntries((current) => current
        .map((entry) => entry.id === editingId ? data : entry)
        .sort((a, b) => a.item_name.localeCompare(b.item_name)));
      setEditingId(null);
      setEditingValue("");
      showNotice(`Updated to “${data.item_name}”.`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to update Item Name.", true);
    } finally {
      setSaving(false);
    }
  }

  const shell = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-name-manager-title"
        className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white text-slate-800 shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6" style={{ background: "linear-gradient(135deg,#0f172a,#1e3a5f,#2563eb)" }}>
          <div>
            <h2 id="item-name-manager-title" className="text-lg font-bold text-white">Item Name Management</h2>
            <p className="text-xs text-blue-200">These values appear in the Item Name dropdown when creating a quotation.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close Item Name management"
            className="rounded-lg px-2.5 py-1.5 text-xl text-white/75 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            ×
          </button>
        </header>

        {loggedRole !== "admin" ? (
          <div className="p-8 text-center">
            <h3 className="font-bold text-slate-800">Admin access required</h3>
            <p className="mt-2 text-sm text-slate-500">Only administrators can add or edit Item Names.</p>
          </div>
        ) : (
          <>
            <div className="border-b border-slate-200 bg-slate-50 p-4 sm:px-6">
              <label htmlFor="new-item-name" className="text-xs font-bold uppercase tracking-wide text-slate-500">Add Item Name</label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                <input
                  id="new-item-name"
                  value={newItemName}
                  onChange={(event) => setNewItemName(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && void addItemName()}
                  maxLength={500}
                  placeholder="Enter the Item Name used in quotations"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <button
                  type="button"
                  onClick={() => void addItemName()}
                  disabled={saving || !newItemName.trim()}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add Item
                </button>
              </div>
            </div>

            {notice && (
              <p role={notice.error ? "alert" : "status"} className={`mx-4 mt-4 rounded-lg border px-4 py-2 text-sm sm:mx-6 ${
                notice.error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"
              }`}>
                {notice.message}
              </p>
            )}

            <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
              <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <p className="text-sm font-semibold text-slate-700">Item table ({entries.length})</p>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search Item Names"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="border-b border-slate-200 px-4 py-3">Item Name</th>
                      <th className="w-40 border-b border-slate-200 px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400">Loading Item Names…</td></tr>
                    ) : filteredEntries.length === 0 ? (
                      <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400">No Item Names found.</td></tr>
                    ) : filteredEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-blue-50/60">
                        <td className="px-4 py-3">
                          {editingId === entry.id ? (
                            <input
                              autoFocus
                              value={editingValue}
                              onChange={(event) => setEditingValue(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") void saveEdit();
                                if (event.key === "Escape") setEditingId(null);
                              }}
                              maxLength={500}
                              className="w-full rounded border border-blue-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                          ) : entry.item_name}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingId === entry.id ? (
                            <div className="flex justify-center gap-2">
                              <button type="button" onClick={() => void saveEdit()} disabled={saving} className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Save</button>
                              <button type="button" onClick={() => setEditingId(null)} className="rounded bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-300">Cancel</button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => startEdit(entry)} className="rounded bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100">Edit</button>
                          )}
                        </td>
                      </tr>
                    ))}
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
