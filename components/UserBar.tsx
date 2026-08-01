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
        <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5">
          <span className="text-base">{loggedRole === "admin" ? "👑" : "👤"}</span>
          <div>
            <span className="text-sm font-semibold text-slate-800 capitalize">{loggedUser}</span>
            {loggedRole === "admin" && (
              <span className="ml-1.5 text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold uppercase">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <span aria-hidden="true">👥</span> User Management
          </button>
        )}

        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 active:scale-95 transition-all"
        >
          <span aria-hidden="true">⏻</span> Logout
        </button>
      </div>

      {showUserMgmt && <UserManagement onClose={closeUserManagement} />}
    </>
  );
}
