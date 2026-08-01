"use client";

import { useState, useEffect, useRef } from "react";
import { SECTIONS, SECTION_COLORS, QuotationItem } from "@/lib/data";
import { useDashboard } from "@/context/DashboardContext";

const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

const EMPTY = {
  // ── Party / Quotation info ─────────────────────────────────────
  date: today,
  partyName: "",
  partyAddress: "",
  // ── Item info ──────────────────────────────────────────────────
  id: "",
  section: SECTIONS[0],
  desc: "",
  size: "",
  hsn: "7323",
  qty: "1",
  rate: "",
};

type FormState = typeof EMPTY;
type Props = { onClose: () => void };

export default function AddItemModal({ onClose }: Props) {
  const { addItem } = useDashboard();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [success, setSuccess] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.date) e.date = "Required";
    if (!form.partyName.trim()) e.partyName = "Required";
    if (!form.partyAddress.trim()) e.partyAddress = "Required";
    if (!form.id.trim()) e.id = "Required";
    if (!form.desc.trim()) e.desc = "Required";
    if (!form.hsn.trim()) e.hsn = "Required";
    const qty = Number(form.qty);
    if (!form.qty || isNaN(qty) || qty < 1) e.qty = "Must be ≥ 1";
    if (form.rate !== "" && isNaN(Number(form.rate))) e.rate = "Must be a number";
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    const qty = Number(form.qty);
    const rate = form.rate === "" ? null : Number(form.rate);
    const amt = rate !== null ? rate * qty : null;

    const newItem: QuotationItem = {
      id: form.id.trim().toUpperCase(),
      section: form.section,
      desc: form.desc.trim(),
      size: form.size.trim() || "STD",
      hsn: form.hsn.trim(),
      qty,
      rate,
      amt,
    };

    addItem(newItem);
    setSuccess(true);
    setForm({ ...EMPTY, date: today });
    setTimeout(() => setSuccess(false), 2500);
  }

  const color = SECTION_COLORS[form.section] ?? "#94a3b8";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

          {/* ── Modal Header ── */}
          <div
            className="flex items-center justify-between px-6 py-4 rounded-t-2xl flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f, #2563eb)" }}
          >
            <div>
              <h2 id="modal-title" className="text-white font-bold text-base">
                Create New Quotation Entry
              </h2>
              <p className="text-blue-200 text-xs mt-0.5">
                Fill in party details and item information
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors text-xl leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* ── Success Banner ── */}
          {success && (
            <div className="mx-6 mt-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-2 flex items-center gap-2 flex-shrink-0">
              <span>✅</span> Entry added successfully! You can add another.
            </div>
          )}

          {/* ── Scrollable Form Body ── */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 overflow-hidden">
            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

              {/* ════════ SECTION 1: Party / Quotation Details ════════ */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-blue-600" />
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Party & Quotation Details
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Date */}
                  <Field label="Date *" error={errors.date}>
                    <input
                      ref={firstInputRef}
                      type="date"
                      value={form.date}
                      onChange={(e) => set("date", e.target.value)}
                      className={inputCls(!!errors.date)}
                    />
                  </Field>

                  {/* Party Name */}
                  <Field label="Party Name *" error={errors.partyName}>
                    <input
                      value={form.partyName}
                      onChange={(e) => set("partyName", e.target.value)}
                      placeholder="e.g. Badami's Harvest Pvt Ltd"
                      className={inputCls(!!errors.partyName)}
                    />
                  </Field>
                </div>

                {/* Party Address — full width */}
                <div className="mt-4">
                  <Field label="Party Address *" error={errors.partyAddress}>
                    <textarea
                      value={form.partyAddress}
                      onChange={(e) => set("partyAddress", e.target.value)}
                      placeholder="e.g. Village Bisrakh Jalalpur, Noida, UP – 203207"
                      rows={2}
                      className={
                        inputCls(!!errors.partyAddress) +
                        " resize-none leading-relaxed"
                      }
                    />
                  </Field>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100" />

              {/* ════════ SECTION 2: Item Details ════════ */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-green-500" />
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Item Details
                  </h3>
                </div>

                {/* ID + Section */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Item ID *" error={errors.id}>
                    <input
                      value={form.id}
                      onChange={(e) => set("id", e.target.value)}
                      placeholder="e.g. MK-20"
                      className={inputCls(!!errors.id)}
                    />
                  </Field>

                  <Field label="Section *" error={errors.section}>
                    <div className="relative">
                      <select
                        value={form.section}
                        onChange={(e) => set("section", e.target.value)}
                        className={inputCls(false) + " pr-8 appearance-none"}
                      >
                        {SECTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none"
                        style={{ background: color }}
                      />
                    </div>
                  </Field>
                </div>

                {/* Description */}
                <div className="mt-4">
                  <Field label="Description *" error={errors.desc}>
                    <input
                      value={form.desc}
                      onChange={(e) => set("desc", e.target.value)}
                      placeholder="e.g. Work Table with 2 U/S"
                      className={inputCls(!!errors.desc)}
                    />
                  </Field>
                </div>

                {/* Size + HSN */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Field label="Size" error={errors.size}>
                    <input
                      value={form.size}
                      onChange={(e) => set("size", e.target.value)}
                      placeholder='e.g. 48"×24"×34" or STD'
                      className={inputCls(false)}
                    />
                  </Field>

                  <Field label="HSN Code *" error={errors.hsn}>
                    <input
                      value={form.hsn}
                      onChange={(e) => set("hsn", e.target.value)}
                      placeholder="e.g. 7323"
                      className={inputCls(!!errors.hsn)}
                    />
                  </Field>
                </div>

                {/* Qty + Rate */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Field label="Quantity *" error={errors.qty}>
                    <input
                      type="number"
                      min={1}
                      value={form.qty}
                      onChange={(e) => set("qty", e.target.value)}
                      className={inputCls(!!errors.qty)}
                    />
                  </Field>

                  <Field label="Unit Rate (₹)" error={errors.rate}>
                    <input
                      type="number"
                      min={0}
                      value={form.rate}
                      onChange={(e) => set("rate", e.target.value)}
                      placeholder="Leave blank for NQ"
                      className={inputCls(!!errors.rate)}
                    />
                  </Field>
                </div>

                {/* Live amount preview */}
                {(form.rate !== "" || form.qty) && (
                  <div
                    className="mt-4 rounded-lg px-4 py-3 text-sm flex justify-between items-center"
                    style={{
                      background: `${color}12`,
                      border: `1px solid ${color}44`,
                    }}
                  >
                    <span className="text-slate-500">Computed Amount</span>
                    <span className="font-bold text-base" style={{ color }}>
                      {form.rate === ""
                        ? "NQ"
                        : `₹${(
                            Number(form.rate) * Number(form.qty || 1)
                          ).toLocaleString("en-IN")}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end flex-shrink-0 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-lg text-white text-sm font-semibold shadow hover:brightness-110 active:scale-95 transition-all"
                style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f, #2563eb)" }}
              >
                + Add Entry
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function inputCls(hasError: boolean) {
  return [
    "w-full border rounded-lg px-3 py-2 text-sm bg-white text-slate-800",
    "focus:outline-none focus:ring-2 transition-colors",
    hasError
      ? "border-red-400 focus:ring-red-200"
      : "border-slate-200 focus:ring-blue-200 focus:border-blue-400",
  ].join(" ");
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
