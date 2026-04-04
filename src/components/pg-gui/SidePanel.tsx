"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface SidePanelProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}

export default function SidePanel({
  open,
  title,
  onClose,
  children,
  width = 400,
}: SidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      style={{ width }}
      className="absolute inset-y-0 right-0 bg-white border-l border-slate-200 shadow-lg z-50 flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
        <span className="text-[13px] font-medium text-slate-700 truncate mr-2">
          {title}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
