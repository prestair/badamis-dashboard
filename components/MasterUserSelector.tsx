"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function MasterUserSelector() {
  const { loggedUser, users, masterActorName, setMasterActorName } = useAuth();
  const [selected, setSelected] = useState("");

  // Only show for master user when no actor is selected yet
  if (loggedUser !== "master" || masterActorName !== "") return null;

  const options = users.filter(
    (u) => u.active && u.username !== "master"
  );

  function handleConfirm() {
    if (!selected) return;
    setMasterActorName(selected);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl p-6 mx-4">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Select Your Name</h2>
        <p className="text-sm text-slate-500 mb-5">
          You are logged in as Master. Please select which user you are.
        </p>
        <div className="mb-5">
          <label htmlFor="master-user-select" className="block text-sm font-medium text-slate-700 mb-1.5">
            Acting as
          </label>
          <select
            id="master-user-select"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">— select a user —</option>
            {options.map((u) => (
              <option key={u.username} value={u.fullName}>
                {u.fullName}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleConfirm}
          disabled={!selected}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
