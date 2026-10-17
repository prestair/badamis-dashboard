"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";

// ── Reverse geocode ───────────────────────────────────────────────────────────
function CityFetcher({ lat, lng, accuracy }: { lat: number; lng: number; accuracy: number | null }) {
  const [city, setCity] = useState<string | null>(null);
  useEffect(() => {
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { "Accept-Language": "en" } })
      .then((r) => r.json())
      .then((d) => {
        const a = d.address ?? {};
        const c = a.city || a.town || a.village || a.county || a.state_district || a.state || "";
        const s = a.state || "";
        setCity(c && s && c !== s ? `${c}, ${s}` : c || s || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      })
      .catch(() => setCity(`${lat.toFixed(4)}, ${lng.toFixed(4)}`));
  }, [lat, lng]);
  const acc = accuracy ? ` (±${Math.round(accuracy)}m)` : "";
  return (
    <span className="text-[11px] text-slate-700">
      {city ? `📍 ${city}${acc}` : <span className="animate-pulse text-slate-400">…</span>}
      {" "}<a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">map</a>
    </span>
  );
}

type LoginActivityRecord = {
  id: string; username: string; logged_in_at: string;
  ip_address: string | null; device_info: string | null;
  latitude: number | null; longitude: number | null;
  gps_accuracy: number | null; gps_error: string | null; city: string | null;
};
type IpEntry = { ip_address: string; label: string | null };
type IpGroup = { ip: string; lastSeen: string; count: number; records: LoginActivityRecord[] };
type DateGroup = { date: string; displayDate: string; ipGroups: IpGroup[] };

const focusableSelector = ["button:not([disabled])", "input:not([disabled])", "[tabindex]:not([tabindex='-1'])"].join(",");

function fmtDT(iso: string) {
  try { return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }); }
  catch { return iso; }
}
function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }); }
  catch { return iso; }
}
function fmtDevice(d: string | null) {
  if (!d) return "—";
  const ua = d.toLowerCase();
  let br = "Browser", os = "Device";
  if (ua.includes("edg/")) br = "Edge"; else if (ua.includes("chrome")) br = "Chrome"; else if (ua.includes("firefox")) br = "Firefox"; else if (ua.includes("safari")) br = "Safari";
  if (ua.includes("windows")) os = "Windows"; else if (ua.includes("android")) os = "Android"; else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS"; else if (ua.includes("mac")) os = "macOS";
  return `${br}/${os}`;
}

function LocationInline({ r }: { r: LoginActivityRecord }) {
  if (r.gps_error) return <span className="text-[11px] text-amber-500">{r.gps_error}</span>;
  if (r.city) {
    const acc = r.gps_accuracy ? ` (±${Math.round(r.gps_accuracy)}m)` : "";
    return (
      <span className="text-[11px] text-slate-700">
        📍 {r.city}{acc}
        {r.latitude && r.longitude && <> · <a href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">map</a></>}
      </span>
    );
  }
  if (r.latitude !== null && r.longitude !== null)
    return <CityFetcher lat={r.latitude} lng={r.longitude} accuracy={r.gps_accuracy} />;
  return <span className="text-[11px] text-slate-400">—</span>;
}

export default function LoginActivityAdmin({ onClose }: { onClose: () => void }) {
  const { loggedRole } = useAuth();
  const [records, setRecords] = useState<LoginActivityRecord[]>([]);
  const [ipLabels, setIpLabels] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ text: string; err: boolean } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => { document.body.style.overflow = prev; };
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const f = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }

  function notify(text: string, err = false) {
    setNotice({ text, err });
    window.setTimeout(() => setNotice(null), 4000);
  }

  async function load() {
    setLoading(true);
    try {
      const [actRes, ipRes] = await Promise.all([
        fetch("/api/login-activity", { headers: { "x-user-role": "admin" } }),
        fetch("/api/authorised-ips", { headers: { "x-user-role": "admin" } }),
      ]);
      if (actRes.ok) {
        const data = await actRes.json();
        setRecords(Array.isArray(data) ? data : []);
      } else notify("Failed to load.", true);
      if (ipRes.ok) {
        const ips: IpEntry[] = await ipRes.json();
        const m = new Map<string, string>();
        for (const e of ips) if (e.label) m.set(e.ip_address, e.label);
        setIpLabels(m);
      }
    } catch { notify("Network error.", true); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (loggedRole === "admin") void load(); }, [loggedRole]); // eslint-disable-line

  // ── Grouping: date → IP ───────────────────────────────────────────────────
  const dateGroups: DateGroup[] = (() => {
    const byDate = new Map<string, LoginActivityRecord[]>();
    for (const r of records) {
      const dk = new Date(r.logged_in_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      if (!byDate.has(dk)) byDate.set(dk, []);
      byDate.get(dk)!.push(r);
    }
    return Array.from(byDate.entries()).map(([date, recs]) => {
      const byIp = new Map<string, LoginActivityRecord[]>();
      for (const r of recs) { const ip = r.ip_address ?? "unknown"; if (!byIp.has(ip)) byIp.set(ip, []); byIp.get(ip)!.push(r); }
      const ipGroups: IpGroup[] = Array.from(byIp.entries())
        .map(([ip, rs]) => ({ ip, lastSeen: rs.reduce((a, b) => a > b.logged_in_at ? a : b.logged_in_at, ""), count: rs.length, records: [...rs].sort((a, b) => b.logged_in_at.localeCompare(a.logged_in_at)) }))
        .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
      const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      return { date, displayDate, ipGroups };
    }).sort((a, b) => b.date.localeCompare(a.date));
  })();

  async function deleteRecord(id: string) {
    try {
      const res = await fetch(`/api/login-activity?id=${id}`, { method: "DELETE", headers: { "x-user-role": "admin" } });
      if (res.ok) { setRecords((p) => p.filter((r) => r.id !== id)); notify("Deleted."); }
      else { const d = await res.json(); notify(d.error ?? "Delete failed.", true); }
    } catch { notify("Network error.", true); }
  }

  async function deleteAllForIp(ip: string) {
    const ids = dateGroups.flatMap((dg) => dg.ipGroups.find((g) => g.ip === ip)?.records.map((r) => r.id) ?? []);
    try {
      await Promise.all(ids.map((id) => fetch(`/api/login-activity?id=${id}`, { method: "DELETE", headers: { "x-user-role": "admin" } })));
      setRecords((p) => p.filter((r) => (r.ip_address ?? "unknown") !== ip));
      setExpanded((p) => { const n = new Set(p); n.delete(ip); return n; });
      notify(`All records for ${ip} deleted.`);
    } catch { notify("Delete failed.", true); }
  }

  function toggle(key: string) { setExpanded((p) => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; }); }

  // ── Excel download ────────────────────────────────────────────────────────
  async function downloadExcel() {
    const XLSX = (await import("xlsx-js-style")).default;

    // Flatten all records sorted by date desc
    const sorted = [...records].sort((a, b) => b.logged_in_at.localeCompare(a.logged_in_at));

    const headers = ["Date & Time", "Username", "IP Address", "IP Label", "Device / Browser", "City", "Location Link", "Latitude", "Longitude", "GPS Accuracy (m)"];
    const colWidths = [22, 14, 16, 14, 18, 28, 52, 12, 12, 18];

    // Style definitions
    const borderThin = { style: "thin", color: { rgb: "B0C4DE" } };
    const borderMedium = { style: "medium", color: { rgb: "2563EB" } };
    const allBorderThin = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };
    const allBorderMedium = { top: borderMedium, bottom: borderMedium, left: borderMedium, right: borderMedium };

    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
      fill: { fgColor: { rgb: "1E3A5F" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: allBorderMedium,
    };

    const rowStyleEven = (col: number) => ({
      font: { sz: 10, color: { rgb: "1E293B" } },
      fill: { fgColor: { rgb: "EFF6FF" } },
      alignment: { horizontal: col >= 7 ? "center" : "left", vertical: "center", wrapText: true },
      border: allBorderThin,
    });

    const rowStyleOdd = (col: number) => ({
      font: { sz: 10, color: { rgb: "1E293B" } },
      fill: { fgColor: { rgb: "FFFFFF" } },
      alignment: { horizontal: col >= 7 ? "center" : "left", vertical: "center", wrapText: true },
      border: allBorderThin,
    });

    // Build worksheet data as array of arrays
    const wsData: unknown[][] = [headers];
    for (const r of sorted) {
      const hasCoords = r.latitude !== null && r.longitude !== null;
      wsData.push([
        fmtDT(r.logged_in_at),
        r.username,
        r.ip_address ?? "",
        ipLabels.get(r.ip_address ?? "") ?? "",
        fmtDevice(r.device_info),
        r.city ?? "",
        hasCoords ? `https://www.google.com/maps?q=${r.latitude},${r.longitude}` : "",
        r.latitude ?? "",
        r.longitude ?? "",
        r.gps_accuracy ?? "",
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Apply styles cell by cell
    for (let row = 0; row < wsData.length; row++) {
      for (let col = 0; col < headers.length; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellRef]) ws[cellRef] = { t: "z", v: "" };
        if (row === 0) {
          ws[cellRef].s = headerStyle;
        } else {
          ws[cellRef].s = row % 2 === 0 ? rowStyleEven(col) : rowStyleOdd(col);
        }
      }
    }

    // Column widths
    ws["!cols"] = colWidths.map((wch) => ({ wch }));

    // Row heights — header taller, data rows auto
    ws["!rows"] = [{ hpt: 28 }, ...sorted.map(() => ({ hpt: 20 }))];

    // Freeze header row
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Login Activity");
    XLSX.writeFile(wb, `login-activity-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (loggedRole !== "admin") return null;

  const shell = (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-2 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="la-title"
        onKeyDown={handleKeyDown}
        className="flex max-h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between px-4 py-2.5"
          style={{ background: "linear-gradient(135deg,#0f172a,#1e3a5f,#2563eb)" }}>
          <div>
            <h2 id="la-title" className="text-sm font-bold text-white">Login Activity</h2>
            <p className="text-[11px] text-blue-200">Date → IP grouped · Click to expand</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void downloadExcel()}
              className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-600">
              ⬇ Excel
            </button>
            <button ref={closeButtonRef} type="button" onClick={onClose}
              className="rounded-lg px-2 py-1 text-lg text-white/75 hover:bg-white/10 hover:text-white focus:outline-none">✕</button>
          </div>
        </div>

        {/* Notice */}
        {notice && (
          <div role={notice.err ? "alert" : "status"}
            className={`mx-4 mt-2 flex-shrink-0 rounded-lg border px-3 py-1.5 text-xs ${notice.err ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
            {notice.text}
          </div>
        )}

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <svg className="h-5 w-5 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span className="ml-2 text-sm text-slate-500">Loading…</span>
            </div>
          ) : dateGroups.length === 0 ? (
            <div className="py-10 text-center text-slate-400">No login activity found</div>
          ) : (
            <div className="space-y-3">
              {dateGroups.map((dg) => (
                <div key={dg.date}>
                  {/* Date header */}
                  <div className="mb-1 flex items-center gap-2 border-b border-slate-200 pb-0.5">
                    <span className="text-xs font-bold text-slate-700">📅 {dg.displayDate}</span>
                    <span className="text-[11px] text-slate-400">
                      {dg.ipGroups.reduce((s, g) => s + g.count, 0)} logins · {dg.ipGroups.length} IP{dg.ipGroups.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* IP groups */}
                  <div className="space-y-1 pl-3">
                    {dg.ipGroups.map((group) => {
                      const key = `${dg.date}__${group.ip}`;
                      const label = ipLabels.get(group.ip);
                      return (
                        <div key={key} className="overflow-hidden rounded-lg border border-slate-200">
                          {/* IP row */}
                          <div className="flex cursor-pointer items-center justify-between bg-slate-50 px-3 py-1.5 hover:bg-slate-100"
                            onClick={() => toggle(key)}>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs text-slate-500">{expanded.has(key) ? "▼" : "▶"}</span>
                              <span className="font-mono text-xs font-bold text-slate-800">{group.ip}</span>
                              {label && <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">({label})</span>}
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{group.count} login{group.count !== 1 ? "s" : ""}</span>
                              <span className="text-[11px] text-slate-500">Last: {fmtTime(group.lastSeen)}</span>
                            </div>
                            <button type="button"
                              onClick={(e) => { e.stopPropagation(); void deleteAllForIp(group.ip); }}
                              className="rounded bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-100">
                              🗑 Del All
                            </button>
                          </div>

                          {/* Expanded rows */}
                          {expanded.has(key) && (
                            <div className="overflow-x-auto border-t border-slate-200">
                              <table className="w-full border-collapse text-left">
                                <thead className="bg-slate-700 text-[10px] uppercase text-white">
                                  <tr>
                                    <th className="px-2 py-1.5">Time</th>
                                    <th className="px-2 py-1.5">User</th>
                                    <th className="px-2 py-1.5">Device</th>
                                    <th className="px-2 py-1.5">Location</th>
                                    <th className="px-2 py-1.5 text-center">Del</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {group.records.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50">
                                      <td className="px-2 py-1 text-[11px] text-slate-700 whitespace-nowrap">{fmtTime(r.logged_in_at)}</td>
                                      <td className="px-2 py-1 font-mono text-[11px] text-slate-700">@{r.username}</td>
                                      <td className="px-2 py-1 text-[11px] text-slate-600 whitespace-nowrap">{fmtDevice(r.device_info)}</td>
                                      <td className="px-2 py-1"><LocationInline r={r} /></td>
                                      <td className="px-2 py-1 text-center">
                                        <button type="button" onClick={() => void deleteRecord(r.id)}
                                          className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-100">✕</button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-1.5 text-[11px] text-slate-500">
          <span>{dateGroups.length} date{dateGroups.length !== 1 ? "s" : ""} · {records.length} total records</span>
          <button type="button" onClick={() => void load()} className="text-blue-500 hover:underline">↺ Refresh</button>
        </div>
      </div>
    </div>
  );

  return createPortal(shell, document.body);
}
