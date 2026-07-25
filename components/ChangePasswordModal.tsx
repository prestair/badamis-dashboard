"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

type Props = { onClose: () => void };

export default function ChangePasswordModal({ onClose }: Props) {
  const { changePassword, loggedUser } = useAuth();

  const [oldPass,  setOldPass]  = useState("");
  const [newPass,  setNewPass]  = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showOld,  setShowOld]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showCon,  setShowCon]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  // password strength
  function strength(p: string): { label: string; color: string; width: string } {
    if (!p) return { label: "", color: "#e2e8f0", width: "0%" };
    if (p.length < 6)  return { label: "Too short", color: "#ef4444", width: "20%" };
    if (p.length < 8)  return { label: "Weak",      color: "#f97316", width: "40%" };
    const hasUpper  = /[A-Z]/.test(p);
    const hasNum    = /\d/.test(p);
    const hasSymbol = /[^A-Za-z0-9]/.test(p);
    const score     = [hasUpper, hasNum, hasSymbol].filter(Boolean).length;
    if (score === 0) return { label: "Fair",   color: "#eab308", width: "55%" };
    if (score === 1) return { label: "Good",   color: "#22c55e", width: "75%" };
    return              { label: "Strong",  color: "#16a34a", width: "100%" };
  }

  const str = strength(newPass);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!oldPass)           { setError("Please enter your current password."); return; }
    if (!newPass)           { setError("Please enter a new password."); return; }
    if (newPass.length < 6) { setError("New password must be at least 6 characters."); return; }
    if (newPass !== confirm) { setError("New passwords do not match."); return; }
    if (newPass === oldPass) { setError("New password must be different from current."); return; }

    setLoading(true);
    setTimeout(() => {
      const result = changePassword(oldPass, newPass);
      if (result.ok) {
        setSuccess(true);
        setTimeout(() => onClose(), 2000);
      } else {
        setError(result.error ?? "Something went wrong.");
      }
      setLoading(false);
    }, 500);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cp-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ background: "linear-gradient(135deg,#1e3a5f,#2563eb)" }}
          >
            <div>
              <h2 id="cp-title" className="text-white font-bold text-base">
                🔐 Change Password
              </h2>
              <p className="text-blue-200 text-xs mt-0.5">
                Logged in as <span className="font-semibold capitalize">{loggedUser}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-xl leading-none transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Success state */}
          {success ? (
            <div className="px-6 py-10 flex flex-col items-center gap-3 text-center">
              <div className="text-5xl">✅</div>
              <p className="text-green-700 font-bold text-lg">Password Changed!</p>
              <p className="text-slate-500 text-sm">Your password has been updated successfully.</p>
              <p className="text-slate-400 text-xs">Closing automatically…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">

              {/* Error banner */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5 flex items-center gap-2">
                  <span>⚠️</span> {error}
                </div>
              )}

              {/* Current password */}
              <PasswordField
                ref={firstRef}
                label="Current Password"
                value={oldPass}
                show={showOld}
                onToggle={() => setShowOld((v) => !v)}
                onChange={(v) => { setOldPass(v); setError(""); }}
                placeholder="Enter current password"
              />

              {/* New password */}
              <div className="space-y-1">
                <PasswordField
                  label="New Password"
                  value={newPass}
                  show={showNew}
                  onToggle={() => setShowNew((v) => !v)}
                  onChange={(v) => { setNewPass(v); setError(""); }}
                  placeholder="Min. 6 characters"
                />
                {/* Strength bar */}
                {newPass && (
                  <div className="mt-1.5 space-y-1">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: str.width, background: str.color }}
                      />
                    </div>
                    <p className="text-[10px] font-semibold" style={{ color: str.color }}>
                      {str.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1">
                <PasswordField
                  label="Confirm New Password"
                  value={confirm}
                  show={showCon}
                  onToggle={() => setShowCon((v) => !v)}
                  onChange={(v) => { setConfirm(v); setError(""); }}
                  placeholder="Re-enter new password"
                />
                {/* Match indicator */}
                {confirm && (
                  <p className={`text-[10px] font-semibold ${newPass === confirm ? "text-green-600" : "text-red-500"}`}>
                    {newPass === confirm ? "✓ Passwords match" : "✗ Passwords do not match"}
                  </p>
                )}
              </div>

              {/* Requirements hint */}
              <div className="bg-slate-50 rounded-lg px-3 py-2 text-[10px] text-slate-500 space-y-0.5 border border-slate-100">
                <p className="font-semibold text-slate-600 mb-1">Password requirements:</p>
                <Req met={newPass.length >= 6}  text="At least 6 characters" />
                <Req met={/[A-Z]/.test(newPass)} text="One uppercase letter (recommended)" />
                <Req met={/\d/.test(newPass)}    text="One number (recommended)" />
                <Req met={/[^A-Za-z0-9]/.test(newPass)} text="One special character (recommended)" />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow hover:brightness-110 active:scale-95 transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#1e3a5f,#2563eb)" }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Updating…
                    </span>
                  ) : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

import { forwardRef } from "react";

const PasswordField = forwardRef<
  HTMLInputElement,
  { label: string; value: string; show: boolean; onToggle: () => void; onChange: (v: string) => void; placeholder: string }
>(({ label, value, show, onToggle, onChange, placeholder }, ref) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔒</span>
      <input
        ref={ref}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label={show ? "Hide" : "Show"}
      >
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  </div>
));
PasswordField.displayName = "PasswordField";

function Req({ met, text }: { met: boolean; text: string }) {
  return (
    <p className={`flex items-center gap-1.5 ${met ? "text-green-600" : "text-slate-400"}`}>
      <span>{met ? "✓" : "○"}</span> {text}
    </p>
  );
}
