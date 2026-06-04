"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { SerializedTicket } from "@/lib/fieldVisitTickets";

const FEEDBACK_OPTIONS = [
  { value: "pending", label: "Not sure yet" },
  { value: "liked", label: "Liked sample" },
  { value: "disliked", label: "Did not like" },
  { value: "neutral", label: "Neutral" },
] as const;

async function patchTicket(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/field-visits/${id}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as {
    ticket?: SerializedTicket;
    errors?: Record<string, string>;
    error?: string;
  };
  return { ok: res.ok, data };
}

export function FieldVisitDetailForm({ id, readOnly }: { id: string; readOnly?: boolean }) {
  const router = useRouter();
  const [ticket, setTicket] = useState<SerializedTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [pointsMsg, setPointsMsg] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const [deliveredDate, setDeliveredDate] = useState("");
  const [sampleFeedback, setSampleFeedback] = useState("pending");
  const [feedbackComments, setFeedbackComments] = useState("");
  const [followUpComments, setFollowUpComments] = useState("");
  const [followUpFeedback, setFollowUpFeedback] = useState("pending");
  const [lostReason, setLostReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/field-visits/${id}`, { credentials: "same-origin" });
    const data = (await res.json()) as { ticket?: SerializedTicket };
    if (res.ok && data.ticket) {
      setTicket(data.ticket);
      if (data.ticket.sampleDeliveredAt) {
        setDeliveredDate(data.ticket.sampleDeliveredAt.slice(0, 10));
      }
      setSampleFeedback(data.ticket.sampleFeedback);
      setFeedbackComments(data.ticket.feedbackComments);
      setFollowUpComments(data.ticket.followUpComments);
      setFollowUpFeedback(data.ticket.followUpFeedback);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(body: Record<string, unknown>, success?: string) {
    setBusy(true);
    setErrors({});
    setMessage("");
    setPointsMsg("");
    const { ok, data } = await patchTicket(id, body);
    setBusy(false);
    if (!ok) {
      if (data?.errors) setErrors(data.errors);
      else setMessage(data?.error ?? "Action failed.");
      return;
    }
    if (data.ticket) {
      setTicket(data.ticket);
      if (data.ticket.status === "closed_lost") {
        setPointsMsg(`${data.ticket.pointsAwarded} points (lost visit)`);
      }
    }
    if (success) setMessage(success);
    router.refresh();
  }

  if (loading) return <p className="text-sm text-zinc-600">Loading…</p>;
  if (!ticket) return <p className="text-sm text-red-700">Visit not found.</p>;

  const canAct = !readOnly;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h1 className="text-lg font-semibold text-zinc-900">{ticket.placeName}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {ticket.customerName}
          {ticket.city ? ` · ${ticket.city}` : ""}
        </p>
        {ticket.contactPerson || ticket.contactPhone ? (
          <p className="mt-1 text-sm text-zinc-600">
            {[ticket.contactPerson, ticket.contactPhone].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {ticket.notes ? <p className="mt-2 text-sm text-zinc-700">{ticket.notes}</p> : null}
        {ticket.sampleProducts.length > 0 ? (
          <ul className="mt-2 list-inside list-disc text-sm text-zinc-700">
            {ticket.sampleProducts.map((p, i) => (
              <li key={i}>
                {p.productName}
                {p.notes ? ` (${p.notes})` : ""}
              </li>
            ))}
          </ul>
        ) : null}
        {ticket.linkedOrderId ? (
          <p className="mt-3 text-sm">
            Linked PO:{" "}
            <Link
              href={`/orders/${ticket.linkedOrderId}/loading-sheet`}
              className="font-medium text-zinc-900 underline"
            >
              {ticket.linkedPoNumber || "View order"}
            </Link>
          </p>
        ) : null}
        {(ticket.status === "closed_won" || ticket.status === "closed_lost") && (
          <p
            className={`mt-2 text-sm font-semibold ${
              ticket.pointsAwarded >= 0 ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {ticket.pointsAwarded >= 0 ? "+" : ""}
            {ticket.pointsAwarded} points
          </p>
        )}
      </div>

      {ticket.needsFollowUp ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>2-week follow-up due.</strong> Sample was delivered on{" "}
          {ticket.sampleDeliveredAt
            ? new Date(ticket.sampleDeliveredAt).toLocaleDateString()
            : "—"}
          . Call the customer and record whether they want to order.
        </div>
      ) : null}

      {message ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>
      ) : null}
      {pointsMsg ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{pointsMsg}</p>
      ) : null}

      {canAct && ticket.status === "sample_requested" ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">2. Deliver sample</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Record when the customer received the sample and their first reaction.
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-800">Received date</label>
              <input
                type="date"
                value={deliveredDate}
                onChange={(e) => setDeliveredDate(e.target.value)}
                className="mt-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
              {errors.sampleDeliveredAt ? (
                <p className="mt-1 text-sm text-red-700">{errors.sampleDeliveredAt}</p>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">Customer reaction</label>
              <select
                value={sampleFeedback}
                onChange={(e) => setSampleFeedback(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                {FEEDBACK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">Comments</label>
              <textarea
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                placeholder="What did they say about the sample?"
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                runAction(
                  {
                    action: "deliver_sample",
                    sampleDeliveredAt: deliveredDate || undefined,
                    sampleFeedback,
                    feedbackComments,
                  },
                  "Sample delivery recorded. Follow-up reminder in 2 weeks.",
                )
              }
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Mark sample delivered
            </button>
          </div>
        </section>
      ) : null}

      {canAct &&
      ticket.status !== "sample_requested" &&
      !ticket.followUpCompletedAt &&
      (ticket.status === "sample_delivered" || ticket.status === "visit_concluded") ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Follow-up (after 2 weeks)</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {ticket.followUpDueAt
              ? `Due from ${new Date(ticket.followUpDueAt).toLocaleDateString()}`
              : "Record customer comments from your follow-up call."}
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-800">Follow-up comments *</label>
              <textarea
                value={followUpComments}
                onChange={(e) => setFollowUpComments(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
              {errors.followUpComments ? (
                <p className="mt-1 text-sm text-red-700">{errors.followUpComments}</p>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">Interest after follow-up</label>
              <select
                value={followUpFeedback}
                onChange={(e) => setFollowUpFeedback(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                {FEEDBACK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                runAction(
                  {
                    action: "record_follow_up",
                    followUpComments,
                    followUpFeedback,
                  },
                  "Follow-up saved.",
                )
              }
              className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Save follow-up
            </button>
          </div>
        </section>
      ) : null}

      {ticket.followUpCompletedAt ? (
        <section className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-700">
          <h2 className="font-semibold text-zinc-900">Follow-up recorded</h2>
          <p className="mt-1">{ticket.followUpComments}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {new Date(ticket.followUpCompletedAt).toLocaleString()}
          </p>
        </section>
      ) : null}

      {canAct && ticket.status === "sample_delivered" ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">3. Conclude visit</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Finish the on-site visit; ticket stays open until the customer places an order or you mark it lost.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => runAction({ action: "conclude" }, "Visit concluded — awaiting order.")}
            className="mt-3 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Conclude visit
          </button>
        </section>
      ) : null}

      {canAct && ticket.status === "visit_concluded" ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900">4. Order outcome</h2>
          <Link
            href={`/new-order?visitTicketId=${ticket.id}&customerName=${encodeURIComponent(ticket.customerName)}&city=${encodeURIComponent(ticket.city)}`}
            className="inline-block rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white"
          >
            Create PO (+10 points on save)
          </Link>
          <div className="border-t border-zinc-100 pt-3">
            <label className="block text-sm font-medium text-zinc-800">Mark lost (no order)</label>
            <input
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Why no order?"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
            {errors.closedReason ? (
              <p className="mt-1 text-sm text-red-700">{errors.closedReason}</p>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction({ action: "close_lost", closedReason: lostReason })}
              className="mt-2 rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Close as lost (−5 points)
            </button>
          </div>
        </section>
      ) : null}

      <Link href="/field-visits" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← All field visits
      </Link>
    </div>
  );
}
