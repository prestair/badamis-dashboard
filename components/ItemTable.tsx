"use client";

import { useState, useMemo } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { SECTIONS, SECTION_COLORS, fmtINR, QuotationItem } from "@/lib/data";

export default function ItemTable() {
  const { items, removeItem, updateItem } = useDashboard();
  const [section, setSection] = useState("");
  const [query, setQuery] = useState("");
  const [editingItem, setEditingItem] = useState<QuotationItem | null>(null);

  // all sections including any newly added custom ones
  const allSections = useMemo(
    () => Array.from(new Set([...SECTIONS, ...items.map((i) => i.section)])),
    [items]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter(
      (i) =>
        (!section || i.section === section) &&
        (!q || i.desc.toLowerCase().includes(q) || i.id.toLowerCase().includes(q))
    );
  }, [items, section, query]);

  const subtotal = useMemo(
    () => filtered.filter((i) => i.amt !== null).reduce((s, i) => s + (i.amt ?? 0), 0),
    [filtered]
  );

  const handleEditSave = (updated: QuotationItem) => {
    updateItem(editingItem!.id, updated);
    setEditingItem(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-700">Complete Item Register</h2>
        <span className="text-xs text-slate-400">{items.length} total items</span>
      </div>

      {/* ── SEARCH + FILTER BAR (Main Dashboard) ── */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Search — prominent */}
        <div className="relative flex-1 min-w-[260px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">🔍</span>
          <input
            type="text"
            placeholder="Search items by ID, description, section…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 shadow-sm transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
            >✕</button>
          )}
        </div>

        {/* Section filter */}
        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
        >
          <option value="">All Sections</option>
          {allSections.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Result count badge */}
        {(query || section) && (
          <div className="flex items-center px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-semibold">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-lg border border-slate-100">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white text-xs">
              {["Sl No", "Section", "Description", "Size", "HSN", "Qty", "Rate", "Amount", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left whitespace-nowrap sticky top-0 bg-slate-800 z-10 last:text-center"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-slate-400 text-sm">
                  No items match your filter.
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => {
                const color = SECTION_COLORS[item.section] ?? "#94a3b8";
                return (
                  <tr
                    key={item.id + idx}
                    className={`border-b border-slate-100 hover:bg-blue-50 transition-colors ${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                    }`}
                  >
                    <td className="px-3 py-2 font-mono font-semibold text-slate-700 whitespace-nowrap">
                      {item.id}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                        style={{ background: `${color}22`, color }}
                      >
                        {item.section}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700 max-w-xs">{item.desc}</td>
                    <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap">
                      {item.size}
                    </td>
                    <td className="px-3 py-2 text-slate-400 text-xs">{item.hsn}</td>
                    <td className="px-3 py-2 text-center text-slate-700">{item.qty}</td>
                    <td className="px-3 py-2 text-right text-slate-600 font-mono">
                      {fmtINR(item.rate)}
                    </td>
                    <td
                      className="px-3 py-2 text-right font-mono"
                      style={{
                        color: item.amt ? "#0f172a" : "#94a3b8",
                        fontWeight: item.amt ? 600 : 400,
                      }}
                    >
                      {fmtINR(item.amt)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditingItem(item)}
                          title="Edit item"
                          className="text-slate-400 hover:text-blue-600 transition-colors text-sm leading-none"
                          aria-label={`Edit ${item.id}`}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          title="Remove item"
                          className="text-slate-300 hover:text-red-500 transition-colors text-base leading-none"
                          aria-label={`Remove ${item.id}`}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-3 text-xs text-slate-500">
        <span>
          Showing <strong className="text-slate-700">{filtered.length}</strong> of{" "}
          <strong className="text-slate-700">{items.length}</strong> items
        </span>
        <span>
          Visible subtotal:{" "}
          <strong className="text-slate-800 text-sm">{fmtINR(subtotal)}</strong>
        </span>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          sections={allSections}
          onSave={handleEditSave}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditItemModal({
  item,
  sections,
  onSave,
  onClose,
}: {
  item: QuotationItem;
  sections: string[];
  onSave: (updated: QuotationItem) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...item });

  const handleChange = (field: keyof QuotationItem, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(form.qty) || 1;
    const rate = form.rate !== null && form.rate !== undefined ? Number(form.rate) : null;
    const amt = rate !== null ? qty * rate : null;
    onSave({ ...form, qty, rate, amt });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Edit Item — {item.id}</h3>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Item Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Item Code</label>
              <input
                type="text"
                value={form.id}
                onChange={(e) => handleChange("id", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Section */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Section</label>
              <select
                value={form.section}
                onChange={(e) => handleChange("section", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {sections.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
            <input
              type="text"
              value={form.desc}
              onChange={(e) => handleChange("desc", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Size */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Size</label>
              <input
                type="text"
                value={form.size}
                onChange={(e) => handleChange("size", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* HSN */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">HSN Code</label>
              <input
                type="text"
                value={form.hsn}
                onChange={(e) => handleChange("hsn", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Qty */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={form.qty}
                onChange={(e) => handleChange("qty", Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Rate */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Rate (₹)</label>
              <input
                type="number"
                min="0"
                value={form.rate ?? ""}
                onChange={(e) => handleChange("rate", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="NQ"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Amount preview */}
          <div className="bg-slate-50 rounded-lg px-4 py-2 flex justify-between items-center">
            <span className="text-xs text-slate-500 font-semibold">Calculated Amount:</span>
            <span className="text-sm font-bold text-slate-800">
              {form.rate !== null && form.rate !== undefined && form.rate !== 0
                ? `₹ ${((Number(form.qty) || 1) * Number(form.rate)).toLocaleString("en-IN")}`
                : "NQ"}
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow transition-all active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
