"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useAuth, UserRole } from "@/context/AuthContext";

type Tab = "users" | "add";
type Notice = { text: string; error: boolean };

const focusableSelector = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function UserManagement({ onClose }: { onClose: () => void }) {
  const {
    users,
    loggedUser,
    loggedRole,
    createUser,
    deleteUser,
    adminChangePassword,
    editUserName,
    setUserActive,
  } = useAuth();
  const [tab, setTab] = useState<Tab>("users");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [changePwdFor, setChangePwdFor] = useState<string | null>(null);
  const [editNameFor, setEditNameFor] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [newName, setNewName] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [form, setForm] = useState({ username: "", fullName: "", password: "", role: "user" as UserRole });
  const [formErr, setFormErr] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;

    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function showNotice(text: string, error = false) {
    setNotice({ text, error });
    window.setTimeout(() => {
      setNotice((current) => current?.text === text ? null : current);
    }, 3000);
  }

  function handleAdd() {
    createUser(form).then((res) => {
      if (res.ok) {
        showNotice(`User "${form.username}" created.`);
        setForm({ username: "", fullName: "", password: "", role: "user" });
        setFormErr("");
        setTab("users");
      } else {
        setFormErr(res.error ?? "Error");
      }
    });
  }

  function handleDelete(username: string) {
    if (confirmDelete !== username) {
      setConfirmDelete(username);
      window.setTimeout(() => setConfirmDelete((current) => current === username ? null : current), 3000);
      return;
    }

    deleteUser(username).then((res) => {
      showNotice(res.ok ? `User "${username}" deleted.` : res.error ?? "Unable to delete user.", !res.ok);
      setConfirmDelete(null);
    });
  }

  function handleChangePwd(username: string) {
    adminChangePassword(username, newPwd).then((res) => {
      if (res.ok) {
        showNotice(`Password changed for "${username}".`);
        setNewPwd("");
        setChangePwdFor(null);
      } else {
        showNotice(res.error ?? "Unable to change password.", true);
      }
    });
  }

  function handleEditName(username: string) {
    editUserName(username, newName).then((res) => {
      if (res.ok) {
        showNotice(`Name updated for "${username}".`);
        setNewName("");
        setEditNameFor(null);
      } else {
        showNotice(res.error ?? "Unable to update name.", true);
      }
    });
  }

  function handleStatusChange(username: string, active: boolean) {
    setUserActive(username, active).then((res) => {
      showNotice(
        res.ok
          ? `User "${username}" marked ${active ? "active" : "inactive"}.`
          : res.error ?? "Unable to update user status.",
        !res.ok
      );
    });
  }

  function startNameEdit(username: string, fullName: string) {
    setEditNameFor(username);
    setNewName(fullName);
    setChangePwdFor(null);
    setNewPwd("");
  }

  function startPasswordEdit(username: string) {
    setChangePwdFor(username);
    setNewPwd("");
    setShowPwd(false);
    setEditNameFor(null);
    setNewName("");
    setNotice(null);
  }

  const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300";

  const shell = loggedRole !== "admin" ? (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        id="user-management-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-management-denied-title"
        onKeyDown={handleDialogKeyDown}
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
      >
        <h2 id="user-management-denied-title" className="text-lg font-bold text-slate-800">Admin access required</h2>
        <p className="mt-2 text-sm text-slate-500">Only administrators can manage users and passwords.</p>
        <button ref={closeButtonRef} type="button" onClick={onClose} className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300">
          Close
        </button>
      </div>
    </div>
  ) : (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        id="user-management-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-management-title"
        onKeyDown={handleDialogKeyDown}
        className="flex max-h-[92dvh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex flex-shrink-0 items-center justify-between px-5 py-4 sm:px-6" style={{ background: "linear-gradient(135deg,#0f172a,#1e3a5f,#2563eb)" }}>
          <div>
            <h2 id="user-management-title" className="text-base font-bold text-white sm:text-lg">User Management</h2>
            <p className="text-xs text-blue-200">Separate admin window · Prestair Systems</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg px-2.5 py-1.5 text-xl text-white/75 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
            aria-label="Close user management"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-shrink-0 border-b border-slate-200" role="tablist" aria-label="User management sections">
          {(["users", "add"] as Tab[]).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              aria-controls={`user-management-${item}-panel`}
              onClick={() => setTab(item)}
              className={`px-5 py-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-300 sm:px-6 ${
                tab === item ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {item === "users" ? `All Users (${users.length})` : "Add User"}
            </button>
          ))}
        </div>

        {notice && (
          <div
            role={notice.error ? "alert" : "status"}
            aria-live="polite"
            className={`mx-5 mt-4 flex-shrink-0 rounded-lg border px-4 py-2 text-sm sm:mx-6 ${
              notice.error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {notice.text}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {tab === "users" && (
            <section id="user-management-users-panel" role="tabpanel" className="overflow-hidden rounded-xl border border-slate-200">
              <div className="max-h-[62dvh] overflow-auto">
                <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
                  <caption className="sr-only">User accounts and administrative controls</caption>
                  <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="border-b border-slate-200 px-4 py-3">Full Name</th>
                      <th scope="col" className="border-b border-slate-200 px-4 py-3">Username</th>
                      <th scope="col" className="border-b border-slate-200 px-4 py-3">Role</th>
                      <th scope="col" className="border-b border-slate-200 px-4 py-3">Status</th>
                      <th scope="col" className="border-b border-slate-200 px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {users.map((user) => {
                      const isCurrentUser = user.username === loggedUser;
                      return (
                        <tr key={user.username} className="align-top hover:bg-slate-50/80">
                          <td className="px-4 py-3">
                            {editNameFor === user.username ? (
                              <div className="flex min-w-[260px] items-center gap-2">
                                <label htmlFor={`full-name-${user.username}`} className="sr-only">New full name for {user.username}</label>
                                <input
                                  id={`full-name-${user.username}`}
                                  type="text"
                                  value={newName}
                                  onChange={(event) => setNewName(event.target.value)}
                                  className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                                />
                                <button type="button" onClick={() => handleEditName(user.username)} className="rounded bg-purple-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-700">Save</button>
                                <button type="button" onClick={() => { setEditNameFor(null); setNewName(""); }} className="rounded bg-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-300">Cancel</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${user.role === "admin" ? "bg-blue-600" : "bg-slate-500"}`}>
                                  {user.fullName.charAt(0).toUpperCase()}
                                </span>
                                <div>
                                  <p className="font-semibold text-slate-800">{user.fullName}</p>
                                  {isCurrentUser && <span className="text-xs font-semibold text-amber-600">Current account</span>}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-slate-600">@{user.username}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${user.role === "admin" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                              {user.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <label htmlFor={`status-${user.username}`} className="sr-only">Status for {user.fullName}</label>
                            <select
                              id={`status-${user.username}`}
                              value={user.active ? "active" : "inactive"}
                              onChange={(event) => handleStatusChange(user.username, event.target.value === "active")}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                                user.active
                                  ? "border-green-200 bg-green-50 text-green-700"
                                  : "border-red-200 bg-red-50 text-red-700"
                              }`}
                              title={isCurrentUser ? "You cannot deactivate your own account" : "Set account status"}
                            >
                              <option value="active">Active</option>
                              <option value="inactive" disabled={isCurrentUser}>Inactive</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            {changePwdFor === user.username ? (
                              <div className="flex min-w-[390px] items-center gap-2">
                                <label htmlFor={`password-${user.username}`} className="sr-only">New password for {user.username}</label>
                                <div className="relative min-w-0 flex-1">
                                  <input
                                    id={`password-${user.username}`}
                                    type={showPwd ? "text" : "password"}
                                    placeholder="New password (min 6 characters)"
                                    value={newPwd}
                                    onChange={(event) => setNewPwd(event.target.value)}
                                    className="w-full rounded border border-slate-300 px-2 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPwd((v) => !v)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                    aria-label={showPwd ? "Hide password" : "Show password"}
                                    tabIndex={-1}
                                  >
                                    {showPwd ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7a9.97 9.97 0 014.93 1.29M15 12a3 3 0 11-4.5-2.6M3 3l18 18" />
                                      </svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                                <button type="button" onClick={() => handleChangePwd(user.username)} className="rounded bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Save</button>
                                <button type="button" onClick={() => { setChangePwdFor(null); setNewPwd(""); setShowPwd(false); }} className="rounded bg-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-300">Cancel</button>
                              </div>
                            ) : (
                              <div className="flex min-w-[360px] flex-wrap items-center gap-2">
                                <button type="button" onClick={() => startNameEdit(user.username, user.fullName)} className="rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100">Edit Name</button>
                                <button type="button" onClick={() => startPasswordEdit(user.username)} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">Reset Password</button>
                                {user.username !== "admin" && (
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(user.username)}
                                    disabled={isCurrentUser}
                                    title={isCurrentUser ? "You cannot delete your own account" : "Delete user"}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                      confirmDelete === user.username
                                        ? "bg-red-600 text-white"
                                        : "bg-red-50 text-red-600 hover:bg-red-100"
                                    }`}
                                  >
                                    {confirmDelete === user.username ? "Confirm Delete" : "Delete"}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "add" && (
            <section id="user-management-add-panel" role="tabpanel" className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <h3 className="mb-5 text-base font-bold text-slate-800">Create a new user account</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="new-user-full-name" className="text-xs font-bold uppercase tracking-wider text-slate-500">Full Name *</label>
                  <input id="new-user-full-name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="e.g. Rahul Sharma" className={inputClass + " mt-1"} />
                </div>
                <div>
                  <label htmlFor="new-user-username" className="text-xs font-bold uppercase tracking-wider text-slate-500">Username *</label>
                  <input id="new-user-username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="e.g. rahul123" className={inputClass + " mt-1 font-mono"} />
                </div>
                <div>
                  <label htmlFor="new-user-password" className="text-xs font-bold uppercase tracking-wider text-slate-500">Password *</label>
                  <input id="new-user-password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Min 6 characters" className={inputClass + " mt-1"} />
                </div>
                <div>
                  <label htmlFor="new-user-role" className="text-xs font-bold uppercase tracking-wider text-slate-500">Role *</label>
                  <select id="new-user-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })} className={inputClass + " mt-1"}>
                    <option value="user">User (Standard)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>
              </div>
              {formErr && <p role="alert" className="mt-4 text-sm text-red-600">{formErr}</p>}
              <button type="button" onClick={handleAdd} className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-700 active:scale-[0.99]">
                Create User
              </button>
            </section>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500 sm:px-6">
          Total {users.length} users · {users.filter((user) => user.active).length} active · {users.filter((user) => !user.active).length} inactive · {users.filter((user) => user.role === "admin").length} admin
        </div>
      </div>
    </div>
  );

  return createPortal(shell, document.body);
}
