"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  SAMPLE_MODE_LABELS,
  STATUS_LABELS,
  type SampleMode,
  type SerializedTicket,
} from "@/lib/fieldVisitTickets";

type Filter = "all" | "open" | "awaiting" | "closed" | "follow_up";

function statusBadgeClass(status: string): string {
  if (status === "closed_won") return "bg-emerald-100 text-emerald-800";
  if (status === "closed_lost") return "bg-red-100 text-red-800";
  if (status === "visit_concluded") return "bg-amber-100 text-amber-900";
  return "bg-sky-100 text-sky-900";
}

function matchesFilter(t: SerializedTicket, filter: Filter): boolean {
  if (filter === "follow_up") return t.needsFollowUp;
  if (filter === "open") return t.status === "active";
  if (filter === "awaiting") return t.status === "visit_concluded";
  if (filter === "closed") return t.status === "closed_won" || t.status === "closed_lost";
  return true;
}

function matchesSearch(t: SerializedTicket, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const haystack = [
    t.placeName,
    t.customerName,
    t.city,
    t.contactPhone,
    t.contactPerson,
    t.notes,
    t.createdByName,
    t.createdByUsername,
    t.linkedPoNumber,
    t.finalConclusion,
    t.followUpComments,
    t.feedbackComments,
    t.closedReason,
    STATUS_LABELS[t.status],
    SAMPLE_MODE_LABELS[t.sampleMode as SampleMode],
    ...t.sampleProducts.flatMap((p) => [p.productName, p.notes]),
    ...t.visitLogs.flatMap((l) => [l.conclusion, l.recordedByName]),
  ];

  return haystack.some((part) => part?.toLowerCase().includes(needle));
}

type RepPoint = { username: string; name: string; points: number; won: number; lost: number };

export function FieldVisitList({ showRep }: { showRep?: boolean }) {
  const router = useRouter();
  const [tickets, setTickets] = useState<SerializedTicket[]>([]);
  const [repPoints, setRepPoints] = useState<RepPoint[]>([]);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const scope = showRep ? "?scope=all" : "";
      const res = await fetch(`/api/field-visits${scope}`, { credentials: "same-origin" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = (await res.json()) as {
        tickets?: SerializedTicket[];
        followUpReminders?: number;
        repPoints?: RepPoint[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not load visits.");
        return;
      }
      setTickets(data.tickets ?? []);
      setRepPoints(data.repPoints ?? []);
      setFollowUpCount(data.followUpReminders ?? 0);
    } catch {
      setError("Could not load visits.");
    } finally {
      setLoading(false);
    }
  }, [showRep]);

  useEffect(() => {
    load();
  }, [load]);

  async function createVisit() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/field-visits", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const data = (await res.json()) as { id?: string; ticket?: SerializedTicket; error?: string };
      if (!res.ok || !data.ticket?.id) {
        setError(data.error ?? "Could not create visit.");
        return;
      }
      router.push(`/field-visits/${data.ticket.id}`);
    } catch {
      setError("Could not create visit.");
    } finally {
      setCreating(false);
    }
  }

  const filtered = tickets.filter(
    (t) => matchesFilter(t, filter) && matchesSearch(t, search),
  );

  return (
    <div className="space-y-4">
      {showRep && repPoints.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Rep points (all time)</h2>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {repPoints.map((r) => (
              <li key={r.username} className="flex justify-between gap-4">
                <span>{r.name}</span>
                <span>
                  <strong className={r.points >= 0 ? "text-emerald-700" : "text-red-700"}>
                    {r.points >= 0 ? "+" : ""}
                    {r.points}
                  </strong>
                  <span className="text-zinc-500">
                    {" "}
                    ({r.won} won, {r.lost} lost)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {followUpCount > 0 ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>{followUpCount}</strong> visit{followUpCount === 1 ? "" : "s"} need a{" "}
          <strong>2-week follow-up</strong> after sample delivery.
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-200 bg-white p-3">
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Search
        </label>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Customer, place, city, phone, product, notes, rep…"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["follow_up", `Follow-up (${followUpCount})`],
            ["open", "In progress"],
            ["awaiting", "Awaiting order"],
            ["closed", "Closed"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === key
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {label}
          </button>
        ))}
        {!showRep ? (
          <button
            type="button"
            disabled={creating}
            onClick={() => void createVisit()}
            className="ml-auto rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {creating ? "Creating…" : "New visit"}
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="text-sm text-zinc-600">Loading…</p> : null}

      {!loading && filtered.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          {search.trim()
            ? "No visits match your search."
            : "No visits in this view."}
        </p>
      ) : null}

      <ul className="space-y-2">
        {filtered.map((t) => (
          <li key={t.id}>
            <Link
              href={`/field-visits/${t.id}`}
              className="block rounded-xl border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-zinc-900">
                    {t.placeName ||
                      t.customerName ||
                      (t.visitLogCount > 0 ? "Visit logged — add customer details" : "New visit (draft)")}
                  </div>
                  <div className="text-sm text-zinc-600">
                    {t.placeName && t.customerName ? t.customerName : null}
                    {t.city ? `${t.placeName || t.customerName ? " · " : ""}${t.city}` : ""}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {t.visitLogCount} visit{t.visitLogCount !== 1 ? "s" : ""}
                    {t.sampleMode !== "none"
                      ? ` · ${SAMPLE_MODE_LABELS[t.sampleMode as SampleMode]}`
                      : ""}
                    {!showRep && t.createdByName ? ` · ${t.createdByName}` : ""}
                  </div>
                  {showRep ? (
                    <div className="mt-0.5 text-xs text-zinc-500">{t.createdByName}</div>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(t.status)}`}
                  >
                    {STATUS_LABELS[t.status]}
                  </span>
                  {t.needsFollowUp ? (
                    <span className="text-xs font-medium text-amber-700">2-week follow-up due</span>
                  ) : null}
                  {t.status === "closed_won" || t.status === "closed_lost" ? (
                    <span
                      className={`text-xs font-semibold ${
                        t.pointsAwarded >= 0 ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {t.pointsAwarded >= 0 ? "+" : ""}
                      {t.pointsAwarded} pts
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
