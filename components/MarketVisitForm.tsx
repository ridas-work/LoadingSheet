"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { MarketVisitGrid } from "@/components/MarketVisitGrid";
import { TrackedPrintButton } from "@/components/TrackedPrintButton";

import {
  STATUS_LABELS,
  VISIT_KIND_LABELS,
  type SerializedTicket,
} from "@/lib/fieldVisitTickets";
import { formatDateOnlyDisplay } from "@/lib/dateOnly";
import {
  createEmptyMarketVisitRows,
  type MarketVisitRow,
} from "@/lib/marketVisitTypes";
import { normalizeMarketStoreKey } from "@/lib/marketVisitStoreKey";

async function patchTicket(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/field-visits/${id}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as {
    ticket?: SerializedTicket;
    openAlertsByStoreKey?: Record<string, string[]>;
    errors?: Record<string, string>;
    error?: string;
  };
  return { ok: res.ok, data };
}

function formatVisitDate(iso: string | null): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10);
}

function filledRowCount(rows: MarketVisitRow[]): number {
  return rows.filter((r) => r.storeName.trim()).length;
}

export function MarketVisitForm({ id, readOnly }: { id: string; readOnly?: boolean }) {
  const [ticket, setTicket] = useState<SerializedTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const [visitDate, setVisitDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [rows, setRows] = useState<MarketVisitRow[]>(() => createEmptyMarketVisitRows(6));
  const [openAlertsByStoreKey, setOpenAlertsByStoreKey] = useState<Record<string, string[]>>({});

  const syncForm = useCallback((t: SerializedTicket) => {
    setVisitDate(formatVisitDate(t.marketVisitDate));
    setRemarks(t.marketVisitRemarks);
    if (t.marketVisitRows.length > 0) {
      setRows(
        t.marketVisitRows.map((r) => ({
          storeName: r.storeName,
          location: r.location,
          availability: { ...r.availability },
          facingUnits: { ...r.facingUnits },
          remarks: r.remarks,
        })),
      );
    } else {
      setRows(createEmptyMarketVisitRows(6));
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/field-visits/${id}`, { credentials: "same-origin" });
    const data = (await res.json()) as { ticket?: SerializedTicket };
    if (res.ok && data.ticket) {
      setTicket(data.ticket);
      syncForm(data.ticket);
    }
    setLoading(false);
  }, [id, syncForm]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const storeKeys = [
      ...new Set(
        rows
          .filter((row) => row.storeName.trim())
          .map((row) => normalizeMarketStoreKey(row.storeName, row.location)),
      ),
    ];
    if (storeKeys.length === 0) {
      setOpenAlertsByStoreKey({});
      return;
    }

    const handle = window.setTimeout(() => {
      void (async () => {
        const params = new URLSearchParams({ storeKeys: storeKeys.join(",") });
        const res = await fetch(`/api/market-visit-alerts?${params.toString()}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { alertsByStoreKey?: Record<string, string[]> };
        setOpenAlertsByStoreKey(data.alertsByStoreKey ?? {});
      })();
    }, 300);

    return () => window.clearTimeout(handle);
  }, [rows]);

  function updateRow(index: number, row: MarketVisitRow) {
    setRows((prev) => prev.map((r, i) => (i === index ? row : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, ...createEmptyMarketVisitRows(1)]);
  }

  function removeRow(index: number) {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  async function save(action: "update_market_visit" | "submit_market_visit") {
    setBusy(true);
    setMessage("");
    setErrors({});
    const { ok, data } = await patchTicket(id, {
      action,
      marketVisitDate: visitDate,
      marketVisitRemarks: remarks,
      marketVisitRows: rows,
    });
    setBusy(false);
    if (!ok) {
      if (data.errors) setErrors(data.errors);
      else setMessage(data.error ?? "Could not save.");
      return;
    }
    if (data.ticket) {
      setTicket(data.ticket);
      syncForm(data.ticket);
    }
    if (data.openAlertsByStoreKey) {
      setOpenAlertsByStoreKey(data.openAlertsByStoreKey);
    }
    setMessage(action === "submit_market_visit" ? "Market visit submitted." : "Draft saved.");
  }

  const submitted = Boolean(ticket?.marketVisitSubmittedAt);
  const editable = !readOnly && !submitted;

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading…</p>;
  }

  if (!ticket) {
    return <p className="text-sm text-red-700">Visit not found.</p>;
  }

  return (
    <div className="market-visit-form space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/field-visits" className="text-sm text-zinc-600 hover:text-zinc-900">
          ← Back to field visits
        </Link>
        <div className="flex flex-wrap gap-2">
          <TrackedPrintButton
            printLog={{
              documentType: "market_visit",
              documentTitle: `Market visit — ${ticket.customerName || ticket.placeName || id}`,
              referenceId: id,
              referencePath: `/field-visits/${id}`,
              metadata: {
                visitDate,
                storeRows: filledRowCount(rows),
              },
            }}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Print
          </TrackedPrintButton>
          {editable ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void save("update_market_visit")}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save draft"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void save("submit_market_visit")}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? "Submitting…" : "Submit"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            {VISIT_KIND_LABELS.market_audit}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-zinc-900 print:text-center print:text-2xl">
            MARKET VISIT FORM DATED{" "}
            <input
              type="date"
              value={visitDate}
              disabled={!editable}
              onChange={(e) => setVisitDate(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-0.5 text-lg font-semibold print:hidden"
            />
            <span className="hidden print:inline">
              {visitDate ? formatDateOnlyDisplay(visitDate) : "___________"}
            </span>
          </h1>
          <p className="mt-1 text-sm text-zinc-600 no-print">
            {ticket.createdByName} · {filledRowCount(rows)} store
            {filledRowCount(rows) !== 1 ? "s" : ""} entered
          </p>
        </div>
        <div className="no-print flex flex-col items-end gap-1 text-sm">
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">
            {STATUS_LABELS[ticket.status]}
          </span>
          {submitted ? (
            <span className="text-xs font-medium text-emerald-700">Submitted</span>
          ) : (
            <span className="text-xs text-zinc-500">Draft</span>
          )}
        </div>
      </div>

      {message ? <p className="no-print text-sm text-emerald-700">{message}</p> : null}
      {errors.marketVisitRows ? (
        <p className="no-print text-sm text-red-700">{errors.marketVisitRows}</p>
      ) : null}

      <MarketVisitGrid
        title="Availability YES / NO"
        rows={rows}
        readOnly={!editable}
        mode="availability"
        openAlertsByStoreKey={openAlertsByStoreKey}
        onRowChange={updateRow}
      />

      <p className="no-print text-xs text-zinc-600">
        <span className="mr-2 inline-block h-3 w-3 rounded-sm border-2 border-red-600 bg-red-300 align-middle" />
        Red cells = <strong>N</strong> (out of stock) or still open from a previous visit — mark <strong>Y</strong> when fixed, then save.
      </p>

      <MarketVisitGrid
        title="FACING DISPLAY IN UNIT"
        rows={rows}
        readOnly={!editable}
        mode="facing"
        onRowChange={updateRow}
      />

      {editable ? (
        <div className="no-print flex gap-2">
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            + Add store row
          </button>
        </div>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-900">Remarks</h2>
        <textarea
          value={remarks}
          disabled={!editable}
          onChange={(e) => setRemarks(e.target.value)}
          rows={4}
          placeholder="General remarks…"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 print:border-black print:bg-white"
        />
      </section>

      {editable ? (
        <div className="no-print space-y-2">
          {rows.map((row, i) =>
            row.storeName || row.location ? (
              <div key={i} className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Remove row {i + 1}
                </button>
              </div>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}
