"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  PRINT_DOCUMENT_TYPE_LABELS,
  PRINT_DOCUMENT_TYPES,
  type PrintDocumentType,
  type SerializedPrintLog,
} from "@/lib/printLog.types";
import { formatDisplayDateTime } from "@/lib/dateOnly";
import { ui } from "@/lib/ui";

export function AdminPrintLogTable() {
  const [logs, setLogs] = useState<SerializedPrintLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [documentType, setDocumentType] = useState<"" | PrintDocumentType>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (username.trim()) params.set("username", username.trim());
    if (documentType) params.set("documentType", documentType);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("limit", "300");

    const res = await fetch(`/api/admin/print-logs?${params.toString()}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { logs?: SerializedPrintLog[]; error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Could not load print history.");
      setLogs([]);
      return;
    }
    setLogs(data?.logs ?? []);
  }, [username, documentType, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className={ui.pageHeader}>
        <h1 className={ui.pageTitle}>Print history</h1>
        <p className={ui.pageDesc}>
          Who printed which document and when — loading sheets, carton labels, reports, and market visits.
        </p>
      </div>

      <div className={`${ui.card} flex flex-wrap items-end gap-4 p-4`}>
        <label className="text-sm text-zinc-700">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">User</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. rashid"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm text-zinc-700">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">Type</span>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as "" | PrintDocumentType)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">All types</option>
            {PRINT_DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {PRINT_DOCUMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-zinc-700">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm text-zinc-700">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </label>
        <button type="button" onClick={() => void load()} className={ui.btnPrimary}>
          Refresh
        </button>
      </div>

      {loading ? <p className="text-sm text-zinc-600">Loading…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && !error ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse border border-zinc-300 text-sm">
            <thead>
              <tr className="bg-zinc-100">
                <th className="border border-zinc-300 px-2 py-2 text-left">Printed at</th>
                <th className="border border-zinc-300 px-2 py-2 text-left">User</th>
                <th className="border border-zinc-300 px-2 py-2 text-left">Type</th>
                <th className="border border-zinc-300 px-2 py-2 text-left">Document</th>
                <th className="border border-zinc-300 px-2 py-2 text-left">Open</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-zinc-300 px-3 py-6 text-center text-zinc-500">
                    No print records match these filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="bg-white">
                    <td className="border border-zinc-300 px-2 py-2 whitespace-nowrap">
                      {formatDisplayDateTime(new Date(log.printedAt))}
                    </td>
                    <td className="border border-zinc-300 px-2 py-2">
                      <div className="font-medium">{log.printedByName}</div>
                      <div className="text-xs text-zinc-500">@{log.printedByUsername}</div>
                    </td>
                    <td className="border border-zinc-300 px-2 py-2">
                      {PRINT_DOCUMENT_TYPE_LABELS[log.documentType]}
                    </td>
                    <td className="border border-zinc-300 px-2 py-2">{log.documentTitle}</td>
                    <td className="border border-zinc-300 px-2 py-2">
                      {log.referencePath ? (
                        <Link href={log.referencePath} className="text-teal-800 underline">
                          View
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
