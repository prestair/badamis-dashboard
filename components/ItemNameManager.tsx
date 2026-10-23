"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";
import { type RateRule, parseRateRule } from "@/lib/rateRules";

type ItemNameEntry = {
  id: string;
  item_name: string;
  rate?: number | null;
  standard_rate?: number | null;
  rate_rule?: RateRule | null;
  created_at?: string;
  updated_at?: string;
};

type Notice = { message: string; error: boolean };

// ── Formula explanation component ────────────────────────────────────────────
function FormulaHelp({ type }: { type: RateRule["type"] }) {
  const content: Record<RateRule["type"], { formula: string; note: string; examples: { label: string; calc: string; result: string }[] }> = {
    standard: {
      formula: "SIZE = STD → Standard Rate\nSIZE = L (inch/mm) → feet(L) × Rate/Foot",
      note: "No dimensions (STD) always picks Standard Rate, bypassing all other rules.",
      examples: [
        { label: "STD size, Std Rate = ₹50,000", calc: "STD → use Standard Rate", result: "₹50,000" },
        { label: "L = 36 INCH, Rate/ft = ₹4,000", calc: "36 ÷ 12 = 3.0 ft × ₹4,000", result: "₹12,000" },
      ],
    },
    perfoot: {
      formula: "feet(L) × Rate/Foot (exact feet)",
      note: "MM → divide by 304.8. INCH → divide by 12. No rounding applied.",
      examples: [
        { label: "L = 36 INCH, Rate/ft = ₹4,000", calc: "36 ÷ 12 = 3.0 ft × ₹4,000", result: "₹12,000" },
        { label: "L = 900 MM, Rate/ft = ₹4,000", calc: "900 ÷ 304.8 = 2.95 ft × ₹4,000", result: "₹11,811" },
      ],
    },
    table: {
      formula: "dominant = max(L, B)\nroundFeet(dominant) × Rate/Foot\n\n0.25 cutoff rule:\n  frac ≤ 0.25  →  floor (round down)\n  frac > 0.25  →  ceil  (round up)",
      note: "Longer of L or B is picked as dominant. If only one is entered, that one is used. STD (no dimensions) → Standard Rate directly.",
      examples: [
        { label: "L=42\", B=30\" → dominant=L=42\"", calc: "42 ÷ 12 = 3.50 ft → frac=0.50 > 0.25 → ceil → 4 ft\n4 ft × ₹4,000", result: "₹16,000" },
        { label: "L=39\", B=30\" → dominant=L=39\"", calc: "39 ÷ 12 = 3.25 ft → frac=0.25 ≤ 0.25 → floor → 3 ft\n3 ft × ₹4,000", result: "₹12,000" },
        { label: "L=30\", B=40\" → dominant=B=40\"", calc: "40 ÷ 12 = 3.33 ft → frac=0.33 > 0.25 → ceil → 4 ft\n4 ft × ₹4,000", result: "₹16,000" },
        { label: "L=900mm, B=600mm → dominant=L=900mm", calc: "900 ÷ 304.8 = 2.95 ft → frac=0.95 > 0.25 → ceil → 3 ft\n3 ft × ₹4,000", result: "₹12,000" },
        { label: "L=48\", B=30\" → dominant=L=48\"", calc: "48 ÷ 12 = 4.00 ft → frac=0.00 ≤ 0.25 → floor → 4 ft\n4 ft × ₹4,000", result: "₹16,000" },
      ],
    },
    conditionalL: {
      formula: "L(inch) ≤ threshold → feet(L) × rateLow\nL(inch) > threshold → feet(L) × rateHigh",
      note: "L is always converted to inches first before comparing with threshold.",
      examples: [
        { label: "Burner Range: threshold=30, low=₹9000, high=₹7000", calc: "", result: "" },
        { label: "L = 30 INCH (≤ 30)", calc: "30 ÷ 12 = 2.5 ft × ₹9,000", result: "₹22,500" },
        { label: "L = 36 INCH (> 30)", calc: "36 ÷ 12 = 3.0 ft × ₹7,000", result: "₹21,000" },
        { label: "L = 900 MM → 35.4\" (> 30)", calc: "900 ÷ 304.8 = 2.95 ft × ₹7,000", result: "₹20,670" },
      ],
    },
    volume: {
      formula: "feet(L) × feet(B) × multiplier (exact feet)",
      note: "Both L and B are required. Used for Exhaust Hoods (area × rate).",
      examples: [
        { label: "Exhaust Hood Without: multiplier=1800", calc: "", result: "" },
        { label: "L=765mm, B=760mm", calc: "(765÷304.8) × (760÷304.8) × 1800\n= 2.51 × 2.49 × 1800", result: "₹11,253" },
        { label: "Exhaust Hood With: multiplier=2100", calc: "", result: "" },
        { label: "L=1200mm, B=900mm", calc: "(1200÷304.8) × (900÷304.8) × 2100\n= 3.94 × 2.95 × 2100", result: "₹24,421" },
      ],
    },
  };

  const info = content[type];
  return (
    <div className="space-y-3 text-xs">
      {/* Formula */}
      <div>
        <div className="mb-1 font-bold text-slate-700">📐 Formula</div>
        <pre className="whitespace-pre-wrap rounded bg-slate-50 px-3 py-2 text-[11px] font-mono text-slate-800 border border-slate-200">{info.formula}</pre>
      </div>
      {/* Note */}
      <div className="rounded bg-amber-50 border border-amber-200 px-3 py-1.5 text-[11px] text-amber-800">
        💡 {info.note}
      </div>
      {/* Examples */}
      <div>
        <div className="mb-1 font-bold text-slate-700">📊 Examples</div>
        <div className="space-y-1.5">
          {info.examples.map((ex, i) => (
            <div key={i} className={`rounded px-2 py-1.5 ${ex.calc ? "bg-green-50 border border-green-100" : "bg-blue-50 border border-blue-100"}`}>
              <div className="font-semibold text-slate-700">{ex.label}</div>
              {ex.calc && <div className="mt-0.5 font-mono text-[10px] text-slate-600 whitespace-pre-wrap">{ex.calc}</div>}
              {ex.result && <div className="mt-0.5 font-bold text-green-700">= {ex.result}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ItemNameManager({ onClose }: { onClose: () => void }) {
  const { loggedRole } = useAuth();
  const [entries, setEntries] = useState<ItemNameEntry[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingRate, setEditingRate] = useState("");
  const [editingStdRate, setEditingStdRate] = useState("");
  const [newItemRate, setNewItemRate] = useState("");
  const [newItemStdRate, setNewItemStdRate] = useState("");
  // Rate-rule editing state (used in the Edit row).
  const [editRuleType, setEditRuleType] = useState<RateRule["type"]>("standard");
  const [editRuleThreshold, setEditRuleThreshold] = useState("");
  const [editRuleLow, setEditRuleLow] = useState("");
  const [editRuleHigh, setEditRuleHigh] = useState("");
  const [editRuleMultiplier, setEditRuleMultiplier] = useState("");
  const [showFormulaHelp, setShowFormulaHelp] = useState(false);
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

  // Export the full Item Name + Rate table to an Excel (.xlsx) file.
  async function exportToExcel() {
    try {
      const XLSX = await import("xlsx");
      const rows = entries.map((e) => ({
        "Item Name": e.item_name,
        "Rate Per Foot": e.rate === null || e.rate === undefined ? "" : e.rate,
        "Standard Rate": e.standard_rate === null || e.standard_rate === undefined ? "" : e.standard_rate,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 48 }, { wch: 16 }, { wch: 16 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Item Rates");
      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Prestair_Item_Rates_${today}.xlsx`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Excel export failed.", true);
    }
  }

  async function addItemName() {
    const itemName = newItemName.trim();
    if (!itemName) {
      showNotice("Enter an Item Name.", true);
      return;
    }

    setSaving(true);
    try {
      // Rates are OPTIONAL. Typed value → send number; blank → send "" (null).
      const toSend = (v: string) => {
        const t = v.trim();
        const n = Number(t);
        return t === "" ? "" : (Number.isFinite(n) && n >= 0 ? n : "");
      };
      const response = await fetch("/api/quotation-item-names", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": loggedRole ?? "",
        },
        body: JSON.stringify({ itemName, rate: toSend(newItemRate), standardRate: toSend(newItemStdRate) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to add Item Name.");
      setEntries((current) => [...current, data].sort((a, b) => a.item_name.localeCompare(b.item_name)));
      setNewItemName("");
      setNewItemRate("");
      setNewItemStdRate("");
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
    setEditingRate(entry.rate === null || entry.rate === undefined ? "" : String(entry.rate));
    setEditingStdRate(entry.standard_rate === null || entry.standard_rate === undefined ? "" : String(entry.standard_rate));
    // Load the rate rule into the edit fields.
    const rule = parseRateRule(entry.rate_rule);
    setEditRuleType(rule.type);
    setEditRuleThreshold(rule.type === "conditionalL" ? String(rule.thresholdInch) : "");
    setEditRuleLow(rule.type === "conditionalL" ? String(rule.rateLow) : "");
    setEditRuleHigh(rule.type === "conditionalL" ? String(rule.rateHigh) : "");
    setEditRuleMultiplier(rule.type === "volume" ? String(rule.multiplier) : "");
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
      // Blank rate is allowed → send empty string so the server stores null.
      const toSend = (v: string) => {
        const t = v.trim();
        const n = Number(t);
        return t === "" ? "" : (Number.isFinite(n) && n >= 0 ? n : "");
      };
      // Build the rate rule object from the edit fields.
      let rateRule: RateRule;
      if (editRuleType === "perfoot") rateRule = { type: "perfoot" };
      else if (editRuleType === "conditionalL") rateRule = {
        type: "conditionalL",
        thresholdInch: Number(editRuleThreshold) || 0,
        rateLow: Number(editRuleLow) || 0,
        rateHigh: Number(editRuleHigh) || 0,
      };
      else if (editRuleType === "volume") rateRule = { type: "volume", multiplier: Number(editRuleMultiplier) || 0 };
      else rateRule = { type: "standard" };

      const response = await fetch(`/api/quotation-item-names/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": loggedRole ?? "",
        },
        body: JSON.stringify({ itemName, rate: toSend(editingRate), standardRate: toSend(editingStdRate), rateRule }),
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
        className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white text-slate-800 shadow-2xl"
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
                <input
                  id="new-item-rate"
                  type="number"
                  min={0}
                  value={newItemRate}
                  onChange={(event) => setNewItemRate(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && void addItemName()}
                  placeholder="Rate / Foot"
                  title="Rate Per Foot — leave blank if not applicable"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:w-32"
                />
                <input
                  id="new-item-std-rate"
                  type="number"
                  min={0}
                  value={newItemStdRate}
                  onChange={(event) => setNewItemStdRate(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && void addItemName()}
                  placeholder="Standard Rate"
                  title="Standard Rate — used when size is STD; leave blank if not applicable"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:w-32"
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => void exportToExcel()}
                    disabled={entries.length === 0}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Export the Item Name + Rate table to Excel"
                  >
                    📥 Export to Excel
                  </button>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search Item Names"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="border-b border-slate-200 px-3 py-2">Item Name</th>
                      <th className="w-28 border-b border-slate-200 px-3 py-2 text-right">Rate Per Foot</th>
                      <th className="w-28 border-b border-slate-200 px-3 py-2 text-right">Standard Rate</th>
                      <th className="w-32 border-b border-slate-200 px-3 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Loading Item Names…</td></tr>
                    ) : filteredEntries.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No Item Names found.</td></tr>
                    ) : filteredEntries.map((entry) => (
                      <React.Fragment key={entry.id}>
                      <tr className="hover:bg-blue-50/60">
                        <td className="px-3 py-2">
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
                        <td className="px-3 py-2 text-right font-mono">
                          {editingId === entry.id ? (
                            <input
                              type="number"
                              min={0}
                              value={editingRate}
                              placeholder="blank"
                              onChange={(event) => setEditingRate(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") void saveEdit();
                                if (event.key === "Escape") setEditingId(null);
                              }}
                              className="w-28 rounded border border-blue-300 px-2 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                          ) : (entry.rate === null || entry.rate === undefined ? <span className="text-slate-300">—</span> : `₹${Number(entry.rate).toLocaleString("en-IN")}`)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {editingId === entry.id ? (
                            <input
                              type="number"
                              min={0}
                              value={editingStdRate}
                              placeholder="blank"
                              onChange={(event) => setEditingStdRate(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") void saveEdit();
                                if (event.key === "Escape") setEditingId(null);
                              }}
                              className="w-28 rounded border border-blue-300 px-2 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                          ) : (entry.standard_rate === null || entry.standard_rate === undefined ? <span className="text-slate-300">—</span> : `₹${Number(entry.standard_rate).toLocaleString("en-IN")}`)}
                        </td>
                        <td className="px-3 py-2 text-center">
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
                      {editingId === entry.id && (
                        <tr className="bg-blue-50/40">
                          <td colSpan={4} className="px-3 py-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Rate Rule:</span>
                              <select
                                value={editRuleType}
                                onChange={(e) => setEditRuleType(e.target.value as RateRule["type"])}
                                className="rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                              >
                                <option value="standard">Standard (STD→Standard Rate, else exact feet × Rate/Foot)</option>
                                <option value="perfoot">Per Foot (exact feet × Rate/Foot)</option>
                                <option value="table">Table (whole feet, 0.25 cutoff × Rate/Foot)</option>
                                <option value="conditionalL">Conditional by L (threshold inch → two rates)</option>
                                <option value="volume">Volume (Lft × Bft × multiplier)</option>
                              </select>

                              {/* ℹ Formula info button */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setShowFormulaHelp((v) => !v)}
                                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-blue-300 bg-blue-50 text-sm font-bold text-blue-600 hover:bg-blue-100"
                                  title="Formula explanation with example"
                                >ℹ</button>

                                {showFormulaHelp && (
                                  <div className="absolute left-0 top-9 z-50 w-80 rounded-xl border border-blue-200 bg-white p-4 shadow-xl"
                                    style={{ minWidth: 320 }}>
                                    <div className="mb-2 flex items-center justify-between">
                                      <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Formula Details</span>
                                      <button type="button" onClick={() => setShowFormulaHelp(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                                    </div>
                                    <FormulaHelp type={editRuleType} />
                                  </div>
                                )}
                              </div>

                              {editRuleType === "conditionalL" && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <label className="text-xs text-slate-600">L ≤</label>
                                  <input type="number" min={0} value={editRuleThreshold} onChange={(e) => setEditRuleThreshold(e.target.value)} placeholder="inch" title="Threshold in inches" className="w-20 rounded border border-slate-300 px-2 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                                  <label className="text-xs text-slate-600">inch → ₹</label>
                                  <input type="number" min={0} value={editRuleLow} onChange={(e) => setEditRuleLow(e.target.value)} placeholder="low /ft" title="Rate per foot when L ≤ threshold" className="w-24 rounded border border-slate-300 px-2 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                                  <label className="text-xs text-slate-600">/ft, else ₹</label>
                                  <input type="number" min={0} value={editRuleHigh} onChange={(e) => setEditRuleHigh(e.target.value)} placeholder="high /ft" title="Rate per foot when L > threshold" className="w-24 rounded border border-slate-300 px-2 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                                  <label className="text-xs text-slate-600">/ft</label>
                                </div>
                              )}

                              {editRuleType === "volume" && (
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-slate-600">Lft × Bft × </label>
                                  <input type="number" min={0} value={editRuleMultiplier} onChange={(e) => setEditRuleMultiplier(e.target.value)} placeholder="e.g. 2100" title="Volume multiplier" className="w-28 rounded border border-slate-300 px-2 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                                </div>
                              )}
                            </div>
                            <p className="mt-2 text-[11px] text-slate-400">
                              {editRuleType === "standard" && "No dimensions → Standard Rate. With L → feet(L) × Rate Per Foot."}
                              {editRuleType === "perfoot" && "Always feet(L) × Rate Per Foot (MM/INCH converted, 0.25-ft rounding)."}
                              {editRuleType === "conditionalL" && "L is converted to inches; picks low/high per-foot rate, then feet(L) × rate."}
                              {editRuleType === "volume" && "Rounded feet(L) × rounded feet(B) × multiplier (e.g. Exhaust Hood 2100 / 1800)."}
                            </p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
