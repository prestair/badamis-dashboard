"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const AddItemModal = dynamic(() => import("@/components/AddItemModal"), { ssr: false });

export default function AddItemButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white border border-white/30 bg-white/10 hover:bg-white/20 active:scale-95 transition-all backdrop-blur-sm"
      >
        <span className="text-lg leading-none">+</span>
        Add Entry
      </button>

      {open && <AddItemModal onClose={() => setOpen(false)} />}
    </>
  );
}
