"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { SerializedTicket } from "@/lib/fieldVisitTickets";

type Filter = "all" | "open" | "awaiting" | "closed" | "follow_up";

const STATUS_LABELS: Record<string, string> = {
  sample_requested: "Sample requested",
  sample_delivered: "Sample delivered",
  visit_concluded: "Awaiting order",
  closed_won: "Won",
  closed_lost: "Lost",
};

function statusBadgeClass(status: string): string {
  if (status === "closed_won") return "bg-emerald-100 text-emerald-800";
  if (status === "closed_lost") return "bg-red-100 text-red-800";
  if (status === "visit_concluded") return "bg-amber-100 text-amber-900";
  if (status === "sample_delivered") return "bg-sky-100 text-sky-900";
  return "bg-zinc-100 text-zinc-800";
}

function matchesFilter(t: SerializedTicket, filter: Filter): boolean {
  if (filter === "follow_up") return t.needsFollowUp;
  if (filter === "open") return t.status === "sample_requested" || t.status === "sample_delivered";
  if (filter === "awaiting") return t.status === "visit_concluded";
  if (filter === "closed") return t.status === "closed_won" || t.status === "closed_lost";
  return true;
}

type RepPoint = { username: string; name: string; points: number; won: number; lost: number };

export function FieldVisitList({ showRep }: { showRep?: boolean }) {
  const [tickets, setTickets] = useState<SerializedTicket[]>([]);
  const [repPoints, setRepPoints] = useState<RepPoint[]>([]);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
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

  const filtered = tickets.filter((t) => matchesFilter(t, filter));

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
          <strong>2-week follow-up</strong> — call the customer and record their comments.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["follow_up", `Follow-up (${followUpCount})`],
            ["open", "Open"],
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
          <Link
            href="/field-visits/new"
            className="ml-auto rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Request sample
          </Link>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="text-sm text-zinc-600">Loading…</p> : null}

      {!loading && filtered.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          No visits in this view.
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
                  <div className="font-medium text-zinc-900">{t.placeName}</div>
                  <div className="text-sm text-zinc-600">
                    {t.customerName}
                    {t.city ? ` · ${t.city}` : ""}
                  </div>
                  {showRep ? (
                    <div className="mt-0.5 text-xs text-zinc-500">{t.createdByName}</div>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(t.status)}`}
                  >
                    {STATUS_LABELS[t.status] ?? t.status}
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
