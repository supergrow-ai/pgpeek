"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { Database } from "lucide-react";

export default function ConnectionDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.addConnection({ name, url });
      setName("");
      setUrl("");
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Database className="w-4 h-4 text-slate-500" />
            </div>
            <DialogTitle className="text-[15px] font-semibold text-slate-800">New Connection</DialogTitle>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-500">Name</label>
            <Input placeholder="Production DB" value={name} onChange={(e) => setName(e.target.value)} required className="h-9 text-[13px]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-500">Connection URL</label>
            <Input
              placeholder="postgresql://user:pass@host:5432/db"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="h-9 font-mono text-[12px]"
            />
          </div>
          {error && (
            <div className="px-3 py-2 rounded-md bg-red-50 border border-red-100 text-[12px] text-red-600">{error}</div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-8 px-3 text-[13px] text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="h-8 px-4 text-[13px] font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors">
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
