"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login, users } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { usernameRef.current?.focus(); }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim()) { setError("Username is required."); return; }
    if (!password)        { setError("Password is required."); return; }
    setLoading(true);
    setTimeout(() => {
      const ok = login(username, password);
      if (!ok) { setError("Invalid username or password."); setPassword(""); }
      setLoading(false);
    }, 500);
  }

  // Quick-login by clicking a user card
  function quickSelect(uname: string) {
    setUsername(uname);
    setPassword("");
    setError("");
    usernameRef.current?.focus();
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4">
        <div>
          <p className="text-white font-bold text-lg tracking-wide">Prestair Systems LLP</p>
          <p className="text-blue-300 text-xs">Commercial Food Service Equipments · Since 1982</p>
        </div>
        <div className="text-right">
          <p className="text-blue-200 text-xs">GST: 09AATFP8342B1ZX</p>
          <p className="text-blue-300 text-xs">Sector 51, Noida</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-5">

          {/* Logo card */}
          <div className="flex flex-col items-center mb-2">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-lg"
              style={{ background: "linear-gradient(135deg,#1e3a5f,#2563eb)" }}>
              📊
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Quotation Dashboard</h1>
            <p className="text-blue-300 text-sm mt-1">Sign in to your account</p>
          </div>

          {/* Login card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#1e3a5f,#2563eb,#0e7490)" }} />
            <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5 flex items-center gap-2">
                  ⚠️ {error}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">👤</span>
                  <input ref={usernameRef} type="text" value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(""); }}
                    placeholder="Enter username" autoComplete="username"
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
                  <input type={showPassword ? "text" : "password"} value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="Enter password" autoComplete="current-password"
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#1e3a5f,#2563eb)" }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Signing in…
                  </span>
                ) : "Sign In →"}
              </button>
            </form>
          </div>

          {/* Quick user select */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-3">Quick Select</p>
            <div className="grid grid-cols-2 gap-2">
              {users.map((u) => (
                <button key={u.username} onClick={() => quickSelect(u.username)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-left hover:scale-[1.02] active:scale-95 ${
                    username === u.username
                      ? "bg-blue-600/40 border-blue-400/60"
                      : "bg-white/5 border-white/15 hover:bg-white/10"
                  }`}>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${
                    u.role === "admin" ? "bg-blue-600" : "bg-slate-600"
                  }`}>
                    {u.fullName.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{u.fullName}</p>
                    <p className="text-slate-400 text-[10px] font-mono">@{u.username}</p>
                  </div>
                  {u.role === "admin" && (
                    <span className="ml-auto text-[9px] text-yellow-300 font-bold">👑</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-blue-400">
            © 2025 Prestair Systems LLP · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
