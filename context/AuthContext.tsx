"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "user";

export type AppUser = {
  username: string;
  password: string;
  role:     UserRole;
  fullName: string;
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
  createUser:         (user: Omit<AppUser, "role"> & { role?: UserRole }) => { ok: boolean; error?: string };
  deleteUser:         (username: string) => { ok: boolean; error?: string };
  adminChangePassword:(username: string, newPass: string) => { ok: boolean; error?: string };
};

// ── Default users ─────────────────────────────────────────────────────────────
const DEFAULT_USERS: AppUser[] = [
  { username: "admin",   password: "prestair@123", role: "admin", fullName: "Administrator" },
  { username: "manager", password: "manager@123",  role: "user",  fullName: "Manager"       },
  { username: "sales1",  password: "sales@123",    role: "user",  fullName: "Sales Team 1"  },
  { username: "sales2",  password: "sales@123",    role: "user",  fullName: "Sales Team 2"  },
];

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users,      setUsers]      = useState<AppUser[]>(DEFAULT_USERS);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedUser, setLoggedUser] = useState("");
  const [loggedRole, setLoggedRole] = useState<UserRole | null>(null);

  // ── Login ──────────────────────────────────────────────────────────────────
  function login(username: string, password: string): boolean {
    const u = users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
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
    return { ok: true };
  }

  // ── Admin: create user ─────────────────────────────────────────────────────
  function createUser(user: Omit<AppUser, "role"> & { role?: UserRole }): { ok: boolean; error?: string } {
    if (loggedRole !== "admin") return { ok: false, error: "Admin access required." };
    const exists = users.find((u) => u.username.toLowerCase() === user.username.trim().toLowerCase());
    if (exists) return { ok: false, error: "Username already exists." };
    if (!user.username.trim()) return { ok: false, error: "Username required." };
    if (user.password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
    setUsers((prev) => [...prev, { ...user, username: user.username.trim(), role: user.role ?? "user" }]);
    return { ok: true };
  }

  // ── Admin: delete user ─────────────────────────────────────────────────────
  function deleteUser(username: string): { ok: boolean; error?: string } {
    if (loggedRole !== "admin")  return { ok: false, error: "Admin access required." };
    if (username === "admin")    return { ok: false, error: "Cannot delete admin account." };
    if (username === loggedUser) return { ok: false, error: "Cannot delete your own account." };
    const exists = users.find((u) => u.username === username);
    if (!exists) return { ok: false, error: "User not found." };
    setUsers((prev) => prev.filter((u) => u.username !== username));
    return { ok: true };
  }

  // ── Admin: change any user's password ─────────────────────────────────────
  function adminChangePassword(username: string, newPass: string): { ok: boolean; error?: string } {
    if (loggedRole !== "admin") return { ok: false, error: "Admin access required." };
    if (newPass.length < 6)     return { ok: false, error: "Password must be at least 6 characters." };
    const exists = users.find((u) => u.username === username);
    if (!exists) return { ok: false, error: "User not found." };
    setUsers((prev) => prev.map((u) => u.username === username ? { ...u, password: newPass } : u));
    return { ok: true };
  }

  return (
    <AuthContext.Provider value={{
      isLoggedIn, loggedUser, loggedRole, users,
      login, logout, changePassword,
      createUser, deleteUser, adminChangePassword,
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
