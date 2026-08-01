"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";

const UserManagement = dynamic(() => import("@/components/UserManagement"), { ssr: false });

export default function UserBar() {
  const { loggedUser, loggedRole, logout } = useAuth();
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const userManagementButtonRef = useRef<HTMLButtonElement>(null);

  const closeUserManagement = useCallback(() => {
    setShowUserMgmt(false);
    window.requestAnimationFrame(() => userManagementButtonRef.current?.focus());
  }, []);

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap justify-end">
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

        {loggedRole === "admin" && (
          <button
            ref={userManagementButtonRef}
            type="button"
            onClick={() => setShowUserMgmt(true)}
            aria-haspopup="dialog"
            aria-expanded={showUserMgmt}
            aria-controls="user-management-dialog"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-100 bg-purple-500/20 border border-purple-400/30 hover:bg-purple-500/40 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <span aria-hidden="true">👥</span> User Management
          </button>
        )}

        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-200 bg-red-500/20 border border-red-400/30 hover:bg-red-500/40 active:scale-95 transition-all"
        >
          <span aria-hidden="true">⏻</span> Logout
        </button>
      </div>

      {showUserMgmt && <UserManagement onClose={closeUserManagement} />}
    </>
  );
}
