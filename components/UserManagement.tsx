"use client";

import { useState } from "react";
import { useAuth, UserRole } from "@/context/AuthContext";

type Tab = "users" | "add";

export default function UserManagement({ onClose }: { onClose: () => void }) {
  const { users, loggedUser, createUser, deleteUser, adminChangePassword } = useAuth();
  const [tab, setTab] = useState<Tab>("users");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [changePwdFor,  setChangePwdFor]  = useState<string | null>(null);
  const [newPwd,        setNewPwd]        = useState("");
  const [pwdMsg,        setPwdMsg]        = useState("");
  const [msg,           setMsg]           = useState("");

  // Add user form
  const [form, setForm] = useState({ username: "", fullName: "", password: "", role: "user" as UserRole });
  const [formErr, setFormErr] = useState("");

  function handleAdd() {
    const res = createUser(form);
    if (res.ok) {
      setMsg(`✅ User "${form.username}" created!`);
      setForm({ username: "", fullName: "", password: "", role: "user" });
      setFormErr("");
      setTab("users");
      setTimeout(() => setMsg(""), 3000);
    } else {
      setFormErr(res.error ?? "Error");
    }
  }

  function handleDelete(username: string) {
    if (confirmDelete === username) {
      const res = deleteUser(username);
      if (res.ok) {
        setMsg(`🗑 User "${username}" deleted.`);
        setTimeout(() => setMsg(""), 3000);
      }
      setConfirmDelete(null);
    } else {
      setConfirmDelete(username);
      setTimeout(() => setConfirmDelete((c) => c === username ? null : c), 3000);
    }
  }

  function handleChangePwd(username: string) {
    const res = adminChangePassword(username, newPwd);
    if (res.ok) {
      setPwdMsg(`✅ Password changed for "${username}"`);
      setNewPwd("");
      setChangePwdFor(null);
      setTimeout(() => setPwdMsg(""), 3000);
    } else {
      setPwdMsg(res.error ?? "Error");
    }
  }

  const inp = "border border-slate-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-slate-800";

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#1e3a5f,#2563eb)" }}>
            <div>
              <h2 className="text-white font-bold text-base">👥 User Management</h2>
              <p className="text-blue-200 text-xs">Admin Panel — Prestair Systems</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-xl">✕</button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 flex-shrink-0">
            {(["users", "add"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-6 py-3 text-sm font-semibold transition-colors ${
                  tab === t ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-500 hover:text-slate-700"
                }`}>
                {t === "users" ? `👥 All Users (${users.length})` : "➕ Add User"}
              </button>
            ))}
          </div>

          {/* Messages */}
          {(msg || pwdMsg) && (
            <div className="mx-6 mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex-shrink-0">
              {msg || pwdMsg}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* ── Users List ── */}
            {tab === "users" && (
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u.username}
                    className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                      u.role === "admin" ? "bg-blue-600" : "bg-slate-500"
                    }`}>
                      {u.fullName.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800 text-sm">{u.fullName}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          u.role === "admin" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                        }`}>
                          {u.role.toUpperCase()}
                        </span>
                        {u.username === loggedUser && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">YOU</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">@{u.username}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Change password */}
                      {changePwdFor === u.username ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            placeholder="New password"
                            value={newPwd}
                            onChange={(e) => setNewPwd(e.target.value)}
                            className="border border-slate-200 rounded px-2 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-blue-300"
                          />
                          <button onClick={() => handleChangePwd(u.username)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700">
                            Save
                          </button>
                          <button onClick={() => { setChangePwdFor(null); setNewPwd(""); }}
                            className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-xs hover:bg-slate-300">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setChangePwdFor(u.username); setNewPwd(""); setPwdMsg(""); }}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
                          title="Change password"
                        >
                          🔐 Pwd
                        </button>
                      )}

                      {/* Delete */}
                      {u.username !== "admin" && (
                        <button
                          onClick={() => handleDelete(u.username)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            confirmDelete === u.username
                              ? "bg-red-600 text-white animate-pulse"
                              : "bg-red-50 text-red-600 hover:bg-red-100"
                          }`}
                        >
                          {confirmDelete === u.username ? "Confirm?" : "🗑 Delete"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Add User Form ── */}
            {tab === "add" && (
              <div className="space-y-4 max-w-md mx-auto">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Full Name *</label>
                  <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="e.g. Rahul Sharma" className={inp + " mt-1"} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Username *</label>
                  <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="e.g. rahul123" className={inp + " mt-1 font-mono"} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Password *</label>
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 6 characters" className={inp + " mt-1"} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Role *</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                    className={inp + " mt-1"}>
                    <option value="user">User (Standard)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>
                {formErr && <p className="text-red-500 text-sm">⚠️ {formErr}</p>}
                <button onClick={handleAdd}
                  className="w-full py-2.5 rounded-xl text-white font-bold text-sm shadow hover:brightness-110 active:scale-95 transition-all"
                  style={{ background: "linear-gradient(135deg,#1e3a5f,#2563eb)" }}>
                  ➕ Create User
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 flex-shrink-0">
            Total {users.length} users &nbsp;·&nbsp; {users.filter((u) => u.role === "admin").length} admin &nbsp;·&nbsp;{" "}
            {users.filter((u) => u.role === "user").length} standard
          </div>
        </div>
      </div>
    </>
  );
}
