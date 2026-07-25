"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";

const ChangePasswordModal = dynamic(
  () => import("@/components/ChangePasswordModal"),
  { ssr: false }
);

export default function UserBar() {
  const { loggedUser, logout } = useAuth();
  const [showChangePwd, setShowChangePwd] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap justify-end">

        {/* Logged-in user badge */}
        <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5">
          <span className="text-base">👤</span>
          <span className="text-sm font-semibold text-white capitalize">{loggedUser}</span>
        </div>

        {/* Change Password */}
        <button
          onClick={() => setShowChangePwd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-100 bg-white/10 border border-white/20 hover:bg-white/20 active:scale-95 transition-all"
          title="Change Password"
        >
          <span>🔐</span>
          Change Password
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-200 bg-red-500/20 border border-red-400/30 hover:bg-red-500/40 active:scale-95 transition-all"
        >
          <span>⏻</span>
          Logout
        </button>
      </div>

      {/* Change Password Modal */}
      {showChangePwd && (
        <ChangePasswordModal onClose={() => setShowChangePwd(false)} />
      )}
    </>
  );
}
