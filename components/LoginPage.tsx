"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────────

type GpsState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "granted"; lat: number; lng: number; accuracy: number; city: string }
  | { status: "denied"; code: number; message: string }
  | { status: "unavailable" };

// ── Browser-specific denial instructions ─────────────────────────────────────

function getDenialInstructions(code: number): string {
  if (code === 1) {
    const ua = navigator.userAgent.toLowerCase();
    if (/edg\//.test(ua))
      return "Edge: Click the lock icon in the address bar → Site permissions → Location → Allow. Then refresh.";
    if (/opr\/|opera/.test(ua))
      return "Opera: Click the lock icon → Site settings → Location → Allow. Then refresh.";
    if (/firefox/.test(ua))
      return "Firefox: Click the lock icon → Connection secure → More information → Permissions → Access Your Location → Allow. Then refresh.";
    if (/safari/.test(ua) && !/chrome/.test(ua))
      return "Safari: Go to Safari → Settings for This Website → Location → Allow. Then refresh.";
    return "Chrome: Click the lock icon in the address bar → Site settings → Location → Allow. Then refresh.";
  }
  if (code === 2) return "Location signal unavailable. Please check your device GPS / Wi-Fi and retry.";
  if (code === 3) return "Location request timed out. Please retry.";
  return "Location access failed. Please check your browser settings.";
}

// ── Reverse geocode: lat/lng → city name ─────────────────────────────────────

async function getCityName(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const data = await res.json();
    const a = data.address ?? {};
    // Pick most meaningful available label
    const city =
      a.city || a.town || a.village || a.county || a.state_district || a.state || "";
    const state = a.state || "";
    if (city && state && city !== state) return `${city}, ${state}`;
    if (city) return city;
    if (state) return state;
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login } = useAuth();

  const [username, setUsername]         = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError]       = useState("");
  const [loading, setLoading]           = useState(false);

  // GPS toggle — default ON
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [gps, setGps]               = useState<GpsState>({ status: "idle" });

  const usernameRef = useRef<HTMLInputElement>(null);

  // ── Request GPS ───────────────────────────────────────────────────────────
  const requestGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGps({ status: "unavailable" });
      return;
    }
    setGps({ status: "requesting" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const city = await getCityName(lat, lng);
        setGps({ status: "granted", lat, lng, accuracy, city });
      },
      (err) => {
        setGps({ status: "denied", code: err.code, message: getDenialInstructions(err.code) });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, []);

  // Auto-request GPS on mount only if toggle is ON
  useEffect(() => {
    if (gpsEnabled) requestGps();
    const frame = window.requestAnimationFrame(() => usernameRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When toggle turned ON after being OFF — re-request
  useEffect(() => {
    if (gpsEnabled && gps.status === "idle") requestGps();
  }, [gpsEnabled, gps.status, requestGps]);

  // ── Form submit ───────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!username.trim()) { setFormError("Username is required."); return; }
    if (!password)        { setFormError("Password is required."); return; }

    // If toggle is ON, enforce GPS
    if (gpsEnabled) {
      if (gps.status === "requesting") {
        setFormError("Please wait — acquiring your location…");
        return;
      }
      if (gps.status === "denied") {
        setFormError("Please allow location access for login.");
        return;
      }
    }

    setLoading(true);
    try {
      const gpsPayload =
        gps.status === "granted"
          ? { latitude: gps.lat, longitude: gps.lng, gpsAccuracy: gps.accuracy, city: gps.city }
          : gps.status === "unavailable"
          ? { gpsError: "Geolocation API not available" }
          : {};

      const ok = await login(username, password, gpsPayload);
      if (!ok) {
        setFormError("Invalid username or password.");
        setPassword("");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── GPS badge (shown below toggle area) ──────────────────────────────────
  function GpsBadge() {
    if (!gpsEnabled) return null;

    if (gps.status === "requesting")
      return (
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          <svg className="h-4 w-4 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Acquiring location…
        </div>
      );

    if (gps.status === "denied")
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-2">
          <div className="flex items-start gap-2 font-semibold">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Location access denied
          </div>
          <p className="text-xs leading-relaxed pl-6">{gps.message}</p>
          <div className="pl-6">
            <button type="button" onClick={requestGps}
              className="mt-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
              Retry
            </button>
          </div>
        </div>
      );

    if (gps.status === "granted")
      return (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-xs text-green-700">
          <svg className="h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span>Location: <strong>{gps.city}</strong></span>
        </div>
      );

    return null;
  }

  const gpsBlocking = gpsEnabled && (gps.status === "requesting" || gps.status === "denied");

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">

      {/* ══════ LEFT PANEL ══════ */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #2563eb 100%)" }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="grid grid-cols-2 gap-4 w-full max-w-lg opacity-20">
            <div className="aspect-square rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-4xl">🍳</div>
            <div className="aspect-square rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-4xl">🏪</div>
            <div className="aspect-square rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-4xl">❄️</div>
            <div className="aspect-square rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-4xl">📐</div>
          </div>
        </div>
        <div className="relative z-10 p-8 lg:p-12">
          <img src="/logos/logo2-1.png" alt="Prestair Systems LLP" className="h-14 w-auto" />
        </div>
        <div className="relative z-10 px-8 lg:px-12 flex-1 flex flex-col justify-center">
          <h2 className="text-white text-3xl lg:text-4xl font-bold leading-tight mb-4">
            Commercial Food<br/>Service Equipments
          </h2>
          <p className="text-blue-200 text-base lg:text-lg leading-relaxed max-w-md">
            Manufacturer of premium kitchen equipment. 5,000+ kitchens installed across the world.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm">
            <div className="text-center"><p className="text-white text-2xl font-black">5000+</p><p className="text-blue-300 text-[10px] uppercase tracking-wider font-semibold">Projects</p></div>
            <div className="text-center"><p className="text-white text-2xl font-black">42+</p><p className="text-blue-300 text-[10px] uppercase tracking-wider font-semibold">Years</p></div>
            <div className="text-center"><p className="text-white text-2xl font-black">3</p><p className="text-blue-300 text-[10px] uppercase tracking-wider font-semibold">Continents</p></div>
          </div>
        </div>
        <div className="relative z-10 p-8 lg:p-12">
          <div className="flex flex-wrap gap-2">
            {["Display Counters", "Kitchen Setup", "Refrigeration", "Floor Planning"].map((s) => (
              <span key={s} className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-blue-100 text-xs font-medium backdrop-blur-sm">{s}</span>
            ))}
          </div>
          <p className="text-blue-400 text-xs mt-4">B-127 Phase-2, Noida, UP 201305 | GST: 09AATFP8342B1ZX</p>
        </div>
      </div>

      {/* ══════ RIGHT PANEL ══════ */}
      <div className="flex-1 flex flex-col bg-slate-50 min-h-screen relative">

        {/* ── GPS toggle — top right corner ── */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 select-none">
            📍 Location
          </span>
          <button
            type="button"
            onClick={() => {
              const next = !gpsEnabled;
              setGpsEnabled(next);
              if (next) setGps({ status: "idle" }); // will re-request via useEffect
            }}
            className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 ${
              gpsEnabled ? "bg-blue-600" : "bg-slate-300"
            }`}
            aria-label={gpsEnabled ? "Disable location requirement" : "Enable location requirement"}
            title={gpsEnabled ? "Location ON — click to disable" : "Location OFF — click to enable"}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${gpsEnabled ? "translate-x-5" : ""}`} />
          </button>
          <span className={`text-xs font-bold ${gpsEnabled ? "text-blue-600" : "text-slate-400"}`}>
            {gpsEnabled ? "ON" : "OFF"}
          </span>
        </div>

        {/* Mobile header */}
        <div className="lg:hidden px-6 pt-8 pb-4">
          <img src="/logos/logo2-1.png" alt="Prestair Systems LLP" className="h-10 w-auto" />
        </div>

        {/* Form centered */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 sm:px-12">
          <div className="w-full max-w-sm space-y-5">

            {/* Welcome */}
            <div className="space-y-2">
              <div className="hidden lg:block mb-4">
                <img src="/logos/logo2-1.png" alt="Prestair Systems LLP" className="h-12 w-auto" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
              <p className="text-slate-500 text-sm">Sign in to access your Quotation Dashboard</p>
            </div>

            {/* GPS badge */}
            <GpsBadge />

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {formError}
                </div>
              )}

              {/* Username */}
              <div className="space-y-1.5">
                <label htmlFor="login-username" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Username</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <input
                    ref={usernameRef}
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setFormError(""); }}
                    placeholder="Enter your username"
                    autoComplete="username"
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFormError(""); }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-11 py-3 text-sm text-slate-800 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || gpsBlocking}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm shadow-lg hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f, #2563eb)" }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Signing in...
                  </span>
                ) : gps.status === "requesting" && gpsEnabled ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Waiting for location…
                  </span>
                ) : "Sign In"}
              </button>
            </form>

            {/* Certifications */}
            <div className="pt-4 border-t border-slate-200">
              <p className="text-center text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-3">Certified &amp; Accredited</p>
              <div className="flex items-center justify-center gap-3 opacity-60">
                {["ISO 9001", "CE", "IAF", "UAF", "GACB"].map((cert) => (
                  <span key={cert} className="px-2 py-1 rounded bg-slate-100 text-[9px] font-bold text-slate-500 border border-slate-200">{cert}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 text-center border-t border-slate-200 bg-white">
          <p className="text-xs text-slate-400">&copy; 2025 Prestair Systems LLP &middot; All rights reserved</p>
        </div>
      </div>
    </div>
  );
}
