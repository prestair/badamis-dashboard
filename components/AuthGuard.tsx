"use client";

import { useAuth } from "@/context/AuthContext";
import LoginPage from "@/components/LoginPage";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) return <LoginPage />;

  return <>{children}</>;
}
