"use client";

import { useAuth } from "@/context/AuthContext";
import LoginPage from "@/components/LoginPage";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, masterOtpPending } = useAuth();

  // Show login page if not logged in, OR if master OTP is still pending
  if (!isLoggedIn || masterOtpPending) return <LoginPage />;

  return <>{children}</>;
}
