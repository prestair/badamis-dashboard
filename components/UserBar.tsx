"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";

const ChangePasswordModal = dynamic(() => import("@/components/ChangePasswordModal"), { ssr: false });
const UserManagement      = dynamic(() => import("@/components/UserManagement"),      { ssr: false });

export default function UserBar() {
  const { loggedUser, loggedRole, logout } = useAuth();
  const [showChangePwd, setShowChangePwd]     = useState(false);
  const [showUserMgmt,  setShowUserMgmt]      = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {/* User badge */}
        <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5">
          <span className="text-base">{loggedRole === "admin" ? "👑" : "👤"}</span>
          <div>
            <span className="text-sm font-semibold text-white capitalize">{loggedUser}</span>
            {loggedRole === "admin" && (
              <span className="ml-1.5 text-[9px] bg-yellow-500/30 text-yellow-200 px-1.5 py-0.5 rounded-full font-bold uppercase">
                Admin
              </span>
            )}
          </div>
        </div>

        {/* Manage Users — admin only */}
        {loggedRole === "admin" && (
          <button
            onClick={() => setShowUserMgmt(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-100 bg-purple-500/20 border border-purple-400/30 hover:bg-purple-500/40 active:scale-95 transition-all"
          >
            <span>👥</span> Users
          </button>
        )}

        {/* Change Password */}
        <button
          onClick={() => setShowChangePwd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-100 bg-white/10 border border-white/20 hover:bg-white/20 active:scale-95 transition-all"
        >
          <span>🔐</span> Change Pwd
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-200 bg-red-500/20 border border-red-400/30 hover:bg-red-500/40 active:scale-95 transition-all"
        >
          <span>⏻</span> Logout
        </button>
      </div>

      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
      {showUserMgmt  && <UserManagement      onClose={() => setShowUserMgmt(false)}  />}
    </>
  );
}
