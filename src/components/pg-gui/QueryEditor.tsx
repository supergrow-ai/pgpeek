"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, Connection, QueryResult } from "@/lib/api";
import { Play, Save, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

const WRITE_PATTERNS = /^\s*(INSERT|UPDATE|DELETE|TRUNCATE|UPSERT|MERGE)\b/i;
const SCHEMA_PATTERNS = /^\s*(CREATE|ALTER|DROP|GRANT|REVOKE|COMMENT\s+ON)\b/i;

interface QueryEditorProps {
  connection: Connection;
  initialQuery?: string;
  savedQueryId?: number;
  readOnly: boolean;
  noSchemaChanges: boolean;
}

export default function QueryEditor({
  connection,
  initialQuery = "",
  savedQueryId,
  readOnly,
  noSchemaChanges,
}: QueryEditorProps) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);

  const runQuery = useCallback(async () => {
    if (!query.trim()) return;

    if (readOnly && WRITE_PATTERNS.test(query)) {
      setError("Blocked: Read-only mode is enabled. Disable it in the sidebar to run write queries.");
      return;
    }
    if (noSchemaChanges && SCHEMA_PATTERNS.test(query)) {
      setError("Blocked: Schema changes are not allowed. Disable the safety switch in the sidebar first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api.runQuery(connection.id, query);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  }, [connection.id, query, readOnly, noSchemaChanges]);

  const handleSave = useCallback(async () => {
    if (!saveName.trim()) return;
    try {
      if (savedQueryId) {
        await api.updateSavedQuery(savedQueryId, saveName, query);
      } else {
        await api.saveQuery(saveName, query);
      }
      setShowSave(false);
      setSaveName("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }, [saveName, query, savedQueryId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        runQuery();
      }
    },
    [runQuery]
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* SQL Input */}
      <div className="p-4 border-b border-[#e2e8f0]">
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="SELECT * FROM ..."
          className="font-mono text-[13px] min-h-[120px] resize-y bg-[#f8fafc] border-[#e2e8f0] focus:border-[#0f172a] focus:ring-[#0f172a]/20 placeholder:text-slate-300 leading-relaxed"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#e2e8f0]">
        <Button
          size="sm"
          onClick={runQuery}
          disabled={loading}
          className="h-8 text-[12px] bg-[#0f172a] hover:bg-[#1e293b] text-white shadow-sm"
        >
          {loading ? (
            <div className="w-3.5 h-3.5 mr-1.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
          )}
          {loading ? "Running..." : "Run"}
          <kbd className="ml-2 text-[10px] opacity-60 bg-white/20 px-1 py-0.5 rounded">
            Cmd+Enter
          </kbd>
        </Button>

        {!showSave ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-[12px] text-slate-500 hover:text-slate-700"
            onClick={() => setShowSave(true)}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save
          </Button>
        ) : (
          <div className="flex items-center gap-1.5">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Query name"
              className="h-8 text-xs w-40"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <Button size="sm" className="h-8 text-xs bg-[#0f172a] hover:bg-[#1e293b]" onClick={handleSave}>
              Save
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-400" onClick={() => setShowSave(false)}>
              Cancel
            </Button>
          </div>
        )}

        {result && (
          <div className="ml-auto flex items-center gap-4 text-[12px] text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {result.duration}ms
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {result.rowCount} rows
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-md bg-red-50 border border-red-100 text-xs text-red-600 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Results */}
      <ScrollArea className="flex-1">
        {result && result.fields.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#e2e8f0]">
                  {result.fields.map((field) => (
                    <th
                      key={field}
                      className="px-4 py-2.5 text-left font-medium text-slate-500 bg-[#f8fafc] whitespace-nowrap sticky top-0 text-[12px]"
                    >
                      {field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors"
                  >
                    {result.fields.map((field) => (
                      <td
                        key={field}
                        className="px-4 py-2 max-w-[300px] truncate font-mono text-[12px] text-slate-600"
                      >
                        {row[field] === null ? (
                          <span className="text-slate-300 italic">NULL</span>
                        ) : (
                          String(row[field])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result && result.fields.length === 0 && (
          <div className="flex items-center gap-2 p-4 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Query executed. {result.rowCount} rows affected.
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
