"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "user";

export type AppUser = {
  id?: string;
  username: string;
  password: string;
  role:     UserRole;
  fullName: string;
  active:   boolean;
};

type AuthContextValue = {
  isLoggedIn:         boolean;
  loggedUser:         string;
  loggedRole:         UserRole | null;
  users:              AppUser[];
  login:              (username: string, password: string) => boolean;
  logout:             () => void;
  changePassword:     (oldPass: string, newPass: string) => { ok: boolean; error?: string };
  // admin only
  createUser:         (user: Omit<AppUser, "role" | "active"> & { role?: UserRole }) => Promise<{ ok: boolean; error?: string }>;
  deleteUser:         (username: string) => Promise<{ ok: boolean; error?: string }>;
  adminChangePassword:(username: string, newPass: string) => Promise<{ ok: boolean; error?: string }>;
  editUserName:       (username: string, newFullName: string) => Promise<{ ok: boolean; error?: string }>;
  setUserActive:      (username: string, active: boolean) => Promise<{ ok: boolean; error?: string }>;
};

// ── Default users ─────────────────────────────────────────────────────────────
const DEFAULT_USERS: AppUser[] = [
  { username: "admin",   password: "prestair@123", role: "admin", fullName: "Administrator", active: true },
];

const STORAGE_KEY = "prestair-users";

function loadPersistedUsers(): AppUser[] {
  if (typeof window === "undefined") return DEFAULT_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_USERS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_USERS;
    const hasAdmin = parsed.some((u: AppUser) => u.username === "admin");
    if (!hasAdmin) parsed.unshift(DEFAULT_USERS[0]);
    return parsed;
  } catch {
    return DEFAULT_USERS;
  }
}

function persistUsers(users: AppUser[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch { /* storage full or unavailable */ }
}

// Map Supabase row to AppUser
function mapDbUser(row: Record<string, unknown>): AppUser {
  return {
    id: String(row.id ?? ""),
    username: String(row.username ?? ""),
    password: String(row.password ?? ""),
    role: row.role === "admin" ? "admin" : "user",
    fullName: String(row.full_name ?? row.fullName ?? ""),
    active: row.active !== false,
  };
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsersRaw] = useState<AppUser[]>(DEFAULT_USERS);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedUser, setLoggedUser] = useState("");
  const [loggedRole, setLoggedRole] = useState<UserRole | null>(null);

  // Load users from API on mount, fall back to localStorage
  useEffect(() => {
    const cached = loadPersistedUsers();
    setUsersRaw(cached);

    fetch("/api/users", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data: unknown[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((row) => mapDbUser(row as Record<string, unknown>));
          setUsersRaw(mapped);
          persistUsers(mapped);
        }
      })
      .catch(() => { /* use localStorage fallback silently */ });
  }, []);

  // Refresh users from API
  async function refreshUsers() {
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((row: Record<string, unknown>) => mapDbUser(row));
        setUsersRaw(mapped);
        persistUsers(mapped);
      }
    } catch { /* silent */ }
  }

  // Wrapper that persists every change locally
  function setUsers(updater: AppUser[] | ((prev: AppUser[]) => AppUser[])) {
    setUsersRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persistUsers(next);
      return next;
    });
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  function login(username: string, password: string): boolean {
    const u = users.find(
      (u) => u.active && u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    );
    if (u) {
      setIsLoggedIn(true);
      setLoggedUser(u.username);
      setLoggedRole(u.role);
      return true;
    }
    return false;
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  function logout() {
    setIsLoggedIn(false);
    setLoggedUser("");
    setLoggedRole(null);
  }

  // ── Change own password ────────────────────────────────────────────────────
  function changePassword(oldPass: string, newPass: string): { ok: boolean; error?: string } {
    const u = users.find((u) => u.username.toLowerCase() === loggedUser.toLowerCase());
    if (!u)               return { ok: false, error: "User not found." };
    if (u.password !== oldPass) return { ok: false, error: "Current password is incorrect." };
    if (newPass.length < 6)     return { ok: false, error: "New password must be at least 6 characters." };
    setUsers((prev) => prev.map((x) => x.username === u.username ? { ...x, password: newPass } : x));
    // Persist to API
    if (u.id) {
      fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-role": loggedRole ?? "" },
        body: JSON.stringify({ id: u.id, password: newPass }),
      }).catch(() => {});
    }
    return { ok: true };
  }

  // ── Admin: create user ─────────────────────────────────────────────────────
  async function createUser(user: Omit<AppUser, "role" | "active"> & { role?: UserRole }): Promise<{ ok: boolean; error?: string }> {
    if (loggedRole !== "admin") return { ok: false, error: "Admin access required." };
    if (!user.username.trim()) return { ok: false, error: "Username required." };
    if (user.password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": "admin" },
        body: JSON.stringify({ username: user.username.trim(), password: user.password, role: user.role ?? "user", fullName: user.fullName }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error ?? "Unable to create user." };
      await refreshUsers();
      return { ok: true };
    } catch {
      // Fallback to local
      const exists = users.find((u) => u.username.toLowerCase() === user.username.trim().toLowerCase());
      if (exists) return { ok: false, error: "Username already exists." };
      setUsers((prev) => [...prev, { ...user, username: user.username.trim(), role: user.role ?? "user", active: true }]);
      return { ok: true };
    }
  }

  // ── Admin: delete user ─────────────────────────────────────────────────────
  async function deleteUser(username: string): Promise<{ ok: boolean; error?: string }> {
    if (loggedRole !== "admin")  return { ok: false, error: "Admin access required." };
    if (username === "admin")    return { ok: false, error: "Cannot delete admin account." };
    if (username === loggedUser) return { ok: false, error: "Cannot delete your own account." };
    const exists = users.find((u) => u.username === username);
    if (!exists) return { ok: false, error: "User not found." };

    if (exists.id) {
      try {
        const res = await fetch(`/api/users?id=${exists.id}`, {
          method: "DELETE",
          headers: { "x-user-role": "admin" },
        });
        if (!res.ok) {
          const data = await res.json();
          return { ok: false, error: data.error ?? "Unable to delete user." };
        }
        await refreshUsers();
        return { ok: true };
      } catch { /* fallback below */ }
    }
    setUsers((prev) => prev.filter((u) => u.username !== username));
    return { ok: true };
  }

  // ── Admin: change any user's password ─────────────────────────────────────
  async function adminChangePassword(username: string, newPass: string): Promise<{ ok: boolean; error?: string }> {
    if (loggedRole !== "admin") return { ok: false, error: "Admin access required." };
    if (newPass.length < 6)     return { ok: false, error: "Password must be at least 6 characters." };
    const exists = users.find((u) => u.username === username);
    if (!exists) return { ok: false, error: "User not found." };

    setUsers((prev) => prev.map((u) => u.username === username ? { ...u, password: newPass } : u));
    if (exists.id) {
      fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-role": "admin" },
        body: JSON.stringify({ id: exists.id, password: newPass }),
      }).catch(() => {});
    }
    return { ok: true };
  }

  // ── Admin: edit user fullName ──────────────────────────────────────────────
  async function editUserName(username: string, newFullName: string): Promise<{ ok: boolean; error?: string }> {
    if (loggedRole !== "admin")   return { ok: false, error: "Admin access required." };
    if (!newFullName.trim())      return { ok: false, error: "Name cannot be empty." };
    const exists = users.find((u) => u.username === username);
    if (!exists) return { ok: false, error: "User not found." };

    setUsers((prev) => prev.map((u) => u.username === username ? { ...u, fullName: newFullName.trim() } : u));
    if (exists.id) {
      fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-role": "admin" },
        body: JSON.stringify({ id: exists.id, fullName: newFullName.trim() }),
      }).catch(() => {});
    }
    return { ok: true };
  }

  async function setUserActive(username: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
    if (loggedRole !== "admin") return { ok: false, error: "Admin access required." };
    if (username === loggedUser && !active) return { ok: false, error: "You cannot deactivate your own account." };
    const exists = users.find((u) => u.username === username);
    if (!exists) return { ok: false, error: "User not found." };

    setUsers((prev) => prev.map((u) => u.username === username ? { ...u, active } : u));
    if (exists.id) {
      fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-role": "admin" },
        body: JSON.stringify({ id: exists.id, active }),
      }).catch(() => {});
    }
    return { ok: true };
  }

  return (
    <AuthContext.Provider value={{
      isLoggedIn, loggedUser, loggedRole, users,
      login, logout, changePassword,
      createUser, deleteUser, adminChangePassword, editUserName, setUserActive,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
