"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type AuthContextValue = {
  isLoggedIn:     boolean;
  login:          (username: string, password: string) => boolean;
  logout:         () => void;
  loggedUser:     string;
  changePassword: (oldPass: string, newPass: string) => { ok: boolean; error?: string };
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // mutable credentials stored in state so changePassword works at runtime
  const [credentials, setCredentials] = useState<Record<string, string>>({
    admin:   "prestair@123",
    manager: "manager@123",
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedUser, setLoggedUser] = useState("");

  function login(username: string, password: string): boolean {
    const u = username.trim().toLowerCase();
    if (credentials[u] && credentials[u] === password) {
      setIsLoggedIn(true);
      setLoggedUser(username.trim());
      return true;
    }
    return false;
  }

  function logout() {
    setIsLoggedIn(false);
    setLoggedUser("");
  }

  function changePassword(oldPass: string, newPass: string): { ok: boolean; error?: string } {
    const u = loggedUser.toLowerCase();
    if (!credentials[u]) return { ok: false, error: "User not found." };
    if (credentials[u] !== oldPass) return { ok: false, error: "Current password is incorrect." };
    if (newPass.length < 6) return { ok: false, error: "New password must be at least 6 characters." };
    setCredentials((prev) => ({ ...prev, [u]: newPass }));
    return { ok: true };
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout, loggedUser, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
