"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  SAMPLE_MODE_LABELS,
  SAMPLE_APPROVAL_LABELS,
  STATUS_LABELS,
  type SampleMode,
  type SerializedTicket,
} from "@/lib/fieldVisitTickets";
import { formatDisplayDate } from "@/lib/dateOnly";

type SampleStockLine = {
  productName: string;
  availableLiters: number;
  availableBottlesEstimate: number;
};

const FEEDBACK_OPTIONS = [
  { value: "pending", label: "Not sure yet" },
  { value: "liked", label: "Liked sample" },
  { value: "disliked", label: "Did not like" },
  { value: "neutral", label: "Neutral" },
] as const;

function customerDirectoryError(name: string, directory: { name: string }[]): string {
  if (!name.trim()) return "Customer name is required.";
  if (directory.length === 0) return "";
  const key = name.trim().toLowerCase();
  if (!directory.some((c) => c.name.trim().toLowerCase() === key)) {
    return "Pick a customer from the approved list only. New accounts must be opened and approved first.";
  }
  return "";
}

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

  const [placeName, setPlaceName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [city, setCity] = useState("");
  const [directory, setDirectory] = useState<Array<{ code: string; name: string; city?: string }>>([]);
  const [contactPhone, setContactPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [notes, setNotes] = useState("");
  const [sampleMode, setSampleMode] = useState<SampleMode>("none");
  const [sampleProductText, setSampleProductText] = useState("");
  const [sampleProductBottles, setSampleProductBottles] = useState("");
  const [sampleStock, setSampleStock] = useState<SampleStockLine[]>([]);

  const [sampleEventDate, setSampleEventDate] = useState("");
  const [sampleFeedback, setSampleFeedback] = useState("pending");
  const [feedbackComments, setFeedbackComments] = useState("");

  const [visitDate, setVisitDate] = useState("");
  const [visitConclusion, setVisitConclusion] = useState("");

  const [finalConclusion, setFinalConclusion] = useState("");
  const [lostReason, setLostReason] = useState("");

  const syncForm = useCallback((t: SerializedTicket) => {
    setPlaceName(t.placeName);
    setCustomerName(t.customerName);
    setCity(t.city);
    setContactPhone(t.contactPhone);
    setContactPerson(t.contactPerson);
    setNotes(t.notes);
    setSampleMode(t.sampleMode);
    setSampleProductText(t.sampleProducts.map((p) => p.productName).join(", "));
    setSampleProductBottles(t.sampleProducts.map((p) => String(p.bottles ?? 1)).join(", "));
    if (t.sampleDeliveredAt) setSampleEventDate(t.sampleDeliveredAt.slice(0, 10));
    else if (t.sampleReceivedAt) setSampleEventDate(t.sampleReceivedAt.slice(0, 10));
    setSampleFeedback(t.sampleFeedback);
    setFeedbackComments(t.feedbackComments);
    setFinalConclusion(t.finalConclusion);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/field-visits/${id}`, { credentials: "same-origin" });
    const data = (await res.json()) as {
      ticket?: SerializedTicket;
      sampleStock?: SampleStockLine[];
    };
    if (res.ok && data.ticket) {
      setTicket(data.ticket);
      syncForm(data.ticket);
      setSampleStock(data.sampleStock ?? []);
    }
    setLoading(false);
  }, [id, syncForm]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/customer-directory", { credentials: "same-origin" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          customers?: Array<{ code: string; name: string; city?: string }>;
        };
        if (!cancelled) setDirectory(Array.isArray(data.customers) ? data.customers : []);
      } catch {
        if (!cancelled) setDirectory([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onCustomerNameChange(value: string) {
    setCustomerName(value);
    const match = directory.find((c) => c.name.toLowerCase() === value.trim().toLowerCase());
    if (match?.city && !city.trim()) setCity(match.city);
  }

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
      syncForm(data.ticket);
      if (data.ticket.status === "closed_lost") {
        setPointsMsg(`${data.ticket.pointsAwarded} points (lost visit)`);
      }
      if (body.action === "add_visit") {
        setVisitDate("");
        setVisitConclusion("");
      }
    }
    if (success) setMessage(success);
    router.refresh();
  }

  function sampleProductsPayload() {
    const names = sampleProductText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const qtys = sampleProductBottles.split(",").map((s) => {
      const n = Number(s.trim());
      return Number.isInteger(n) && n >= 1 ? n : 1;
    });
    return names.map((productName, i) => ({
      productName,
      notes: "",
      bottles: qtys[i] ?? 1,
    }));
  }

  function stockLitersForProduct(productName: string): number | null {
    if (sampleStock.length === 0) return null;
    const trimmed = productName.trim().toLowerCase();
    let total = 0;
    let matched = false;
    for (const line of sampleStock) {
      if (
        line.productName.trim().toLowerCase() === trimmed ||
        line.productName.trim().toLowerCase().includes(trimmed) ||
        trimmed.includes(line.productName.trim().toLowerCase())
      ) {
        total += line.availableLiters;
        matched = true;
      }
    }
    return matched ? total : null;
  }

  const outgoingStockWarnings =
    sampleMode === "outgoing" && sampleStock.length > 0
      ? sampleProductsPayload()
          .map((p) => {
            const have = stockLitersForProduct(p.productName);
            if (have == null) return `${p.productName} — not in sample pool`;
            const need = p.bottles;
            if (have < need * 0.5) {
              return `${p.productName} — low sample stock (${have.toFixed(1)} L available)`;
            }
            return null;
          })
          .filter(Boolean)
      : [];

  if (loading) return <p className="text-sm text-zinc-600">Loading…</p>;
  if (!ticket) return <p className="text-sm text-red-700">Visit not found.</p>;

  const canAct = !readOnly && ticket.status === "active";
  const canOutcome = !readOnly && ticket.status === "visit_concluded";
  const canMarkLostActive = !readOnly && ticket.status === "active" && ticket.visitLogCount >= 1;
  const sampleApproval = ticket.sampleApprovalStatus;
  const canRequestSample =
    canAct &&
    sampleMode !== "none" &&
    (sampleApproval === "none" || sampleApproval === "rejected");
  const canRecordSample =
    !readOnly && ticket.allowedActions.includes("record_sample_event");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">
            {ticket.placeName || ticket.customerName || "New visit"}
          </h1>
          {ticket.placeName && ticket.customerName ? (
            <p className="mt-1 text-sm text-zinc-600">{ticket.customerName}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-800">
          {STATUS_LABELS[ticket.status]}
        </span>
      </div>

      {ticket.needsFollowUp ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>2-week follow-up due</strong> after sample delivery — record feedback on your next
          visit log.
        </div>
      ) : null}

      {message ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>
      ) : null}
      {pointsMsg ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{pointsMsg}</p>
      ) : null}

      {canAct || readOnly ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Customer details</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-800">Place / shop name *</label>
              <input
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                disabled={!canAct}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
              />
              {errors.placeName ? <p className="mt-1 text-sm text-red-700">{errors.placeName}</p> : null}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-800">Customer name *</label>
              <input
                value={customerName}
                list="fv-customer-directory-options"
                onChange={(e) => onCustomerNameChange(e.target.value)}
                disabled={!canAct}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
              />
              <datalist id="fv-customer-directory-options">
                {directory.map((c) => (
                  <option key={c.code} value={c.name} />
                ))}
              </datalist>
              <p className="mt-1 text-xs text-zinc-500">
                Choose from the approved list only — new customers must be opened as an account and
                approved by admin first.
              </p>
              {errors.customerName ? (
                <p className="mt-1 text-sm text-red-700">{errors.customerName}</p>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!canAct}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">Phone</label>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={!canAct}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">Contact person</label>
              <input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                disabled={!canAct}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-800">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!canAct}
                rows={2}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
              />
            </div>
          </div>
          {canAct ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const customerErr = customerDirectoryError(customerName, directory);
                if (customerErr) {
                  setErrors({ customerName: customerErr });
                  return;
                }
                runAction(
                  {
                    action: "update_profile",
                    placeName,
                    customerName,
                    city,
                    contactPhone,
                    contactPerson,
                    notes,
                    sampleMode,
                    sampleProducts: sampleProductsPayload(),
                  },
                  "Customer details saved.",
                );
              }}
              className="mt-3 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Save customer details
            </button>
          ) : null}
        </section>
      ) : null}

      {canAct || (readOnly && ticket.sampleMode !== "none") ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Sample</h2>
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-3">
              {(["none", "outgoing", "incoming"] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-2 text-sm text-zinc-800">
                  <input
                    type="radio"
                    name="sampleMode"
                    checked={sampleMode === mode}
                    onChange={() => setSampleMode(mode)}
                    disabled={!canAct || sampleApproval === "pending" || sampleApproval === "approved"}
                  />
                  {SAMPLE_MODE_LABELS[mode]}
                </label>
              ))}
            </div>
            {sampleMode !== "none" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-800">Products (comma-separated)</label>
                  <input
                    value={sampleProductText}
                    onChange={(e) => setSampleProductText(e.target.value)}
                    disabled={
                      !canAct || sampleApproval === "pending" || sampleApproval === "approved"
                    }
                    placeholder="Rhino 750ml, Brighten 3L"
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
                  />
                  <label className="mt-2 block text-sm font-medium text-zinc-800">
                    Bottles per product (comma-separated, default 1)
                  </label>
                  <input
                    value={sampleProductBottles}
                    onChange={(e) => setSampleProductBottles(e.target.value)}
                    disabled={
                      !canAct || sampleApproval === "pending" || sampleApproval === "approved"
                    }
                    placeholder="1, 2"
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
                  />
                  {errors.sampleProducts ? (
                    <p className="mt-1 text-sm text-red-700">{errors.sampleProducts}</p>
                  ) : null}
                  {sampleMode === "outgoing" && sampleStock.length > 0 ? (
                    <div className="mt-2 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-xs text-violet-950">
                      <p className="font-medium">Sample production stock (Esha pool)</p>
                      <ul className="mt-1 list-inside list-disc">
                        {sampleStock.map((line) => (
                          <li key={line.productName}>
                            {line.productName}: {line.availableLiters} L (~{line.availableBottlesEstimate}{" "}
                            bottles)
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {outgoingStockWarnings.length > 0 ? (
                    <p className="mt-2 text-sm text-amber-800">
                      {outgoingStockWarnings.join(" · ")}
                    </p>
                  ) : null}
                </div>

                {sampleApproval !== "none" ? (
                  <p
                    className={`rounded-lg px-3 py-2 text-sm ${
                      sampleApproval === "pending"
                        ? "border border-amber-200 bg-amber-50 text-amber-950"
                        : sampleApproval === "approved"
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                          : "border border-red-200 bg-red-50 text-red-900"
                    }`}
                  >
                    {SAMPLE_APPROVAL_LABELS[sampleApproval]}
                    {sampleApproval === "rejected" && ticket.sampleRejectionNote
                      ? ` — ${ticket.sampleRejectionNote}`
                      : ""}
                    {sampleApproval === "approved" && ticket.sampleApprovedByName
                      ? ` (${ticket.sampleApprovedByName})`
                      : ""}
                  </p>
                ) : null}

                {canRequestSample ? (
                  <div className="rounded-lg border border-sky-100 bg-sky-50 p-3 space-y-2">
                    <p className="text-xs text-sky-950">
                      <strong>Step 1 — Request sample:</strong> Sends full details to Waleed for approval.
                      {sampleMode === "outgoing"
                        ? " After Waleed approves, Rashid assigns sample batches — the bottle count is deducted from Esha’s sample production stock at that point, not now. "
                        : " "}
                      Record delivery and customer reaction after he approves.
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (!placeName.trim() || !customerName.trim()) {
                          setErrors({
                            placeName: !placeName.trim() ? "Place / shop name is required." : "",
                            customerName: !customerName.trim() ? "Customer name is required." : "",
                          });
                          return;
                        }
                        const customerErr = customerDirectoryError(customerName, directory);
                        if (customerErr) {
                          setErrors({ customerName: customerErr });
                          return;
                        }
                        void runAction(
                          {
                            action: "request_sample_approval",
                            placeName,
                            customerName,
                            city,
                            contactPhone,
                            contactPerson,
                            notes,
                            sampleMode,
                            sampleProducts: sampleProductsPayload(),
                          },
                          "Sample request sent to Waleed for approval.",
                        );
                      }}
                      className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Request sample approval
                    </button>
                  </div>
                ) : null}

                {canRecordSample ? (
                  <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 space-y-3">
                    <p className="text-xs text-zinc-600">
                      <strong>Step 2 — After Waleed approved:</strong>{" "}
                      {sampleMode === "outgoing"
                        ? "Record when you delivered our sample and the customer’s first reaction."
                        : "Record when the customer gave you a sample and your evaluation."}
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-zinc-800">Date</label>
                      <input
                        type="date"
                        value={sampleEventDate}
                        onChange={(e) => setSampleEventDate(e.target.value)}
                        className="mt-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      />
                      {errors.eventDate ? (
                        <p className="mt-1 text-sm text-red-700">{errors.eventDate}</p>
                      ) : null}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-800">Reaction</label>
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
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          {
                            action: "record_sample_event",
                            eventDate: sampleEventDate || undefined,
                            sampleFeedback,
                            feedbackComments,
                          },
                          "Sample delivery and reaction recorded.",
                        )
                      }
                      className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {sampleMode === "outgoing" ? "Record sample delivered" : "Record sample received"}
                    </button>
                  </div>
                ) : null}

                {sampleApproval === "pending" ? (
                  <p className="text-xs text-amber-800">
                    Waiting for Waleed — delivery and reaction fields unlock after approval.
                  </p>
                ) : null}

                {ticket.sampleDeliveredAt || ticket.sampleReceivedAt ? (
                  <p className="text-xs text-zinc-500">
                    {ticket.sampleDeliveredAt
                      ? `Delivered ${formatDisplayDate(ticket.sampleDeliveredAt)}`
                      : `Received ${ticket.sampleReceivedAt ? formatDisplayDate(ticket.sampleReceivedAt) : ""}`}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">
          Visit history ({ticket.visitLogCount})
        </h2>
        {ticket.visitLogs.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No visits logged yet.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {ticket.visitLogs.map((log) => (
              <li key={log.id || log.recordedAt} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                <p className="text-xs font-medium text-zinc-500">
                  {log.visitDate ? formatDisplayDate(log.visitDate) : "—"}
                  {log.recordedByName ? ` · ${log.recordedByName}` : ""}
                </p>
                <p className="mt-1 text-sm text-zinc-800">{log.conclusion}</p>
              </li>
            ))}
          </ol>
        )}

        {canAct ? (
          <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
            <h3 className="text-sm font-medium text-zinc-900">Add visit</h3>
            {!placeName.trim() || !customerName.trim() ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                Fill in <strong>place</strong> and <strong>customer name</strong> above, then click{" "}
                <strong>Save customer details</strong> before logging a visit.
              </p>
            ) : null}
            <div>
              <label className="block text-sm font-medium text-zinc-800">Visit date *</label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="mt-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
              {errors.visitDate ? <p className="mt-1 text-sm text-red-700">{errors.visitDate}</p> : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">Conclusion *</label>
              <textarea
                value={visitConclusion}
                onChange={(e) => setVisitConclusion(e.target.value)}
                rows={3}
                placeholder="What happened on this visit?"
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
              {errors.conclusion ? (
                <p className="mt-1 text-sm text-red-700">{errors.conclusion}</p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!placeName.trim() || !customerName.trim()) {
                  setErrors({
                    placeName: !placeName.trim() ? "Place / shop name is required." : "",
                    customerName: !customerName.trim() ? "Customer name is required." : "",
                    profile:
                      "Save customer details above before logging a visit.",
                  });
                  setMessage("");
                  return;
                }
                void runAction(
                  { action: "add_visit", visitDate, conclusion: visitConclusion },
                  "Visit saved.",
                );
              }}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Save visit
            </button>
            {errors.profile ? <p className="text-sm text-red-700">{errors.profile}</p> : null}
          </div>
        ) : null}
      </section>

      {ticket.finalConclusion && ticket.status !== "active" ? (
        <section className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Final conclusion</h2>
          <p className="mt-1 text-sm text-zinc-700">{ticket.finalConclusion}</p>
        </section>
      ) : null}

      {canAct ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Final conclusion</h2>
          <p className="mt-1 text-xs text-zinc-500">
            When you are done visiting this customer, enter your overall conclusion. You need at least
            one visit log first.
          </p>
          <textarea
            value={finalConclusion}
            onChange={(e) => setFinalConclusion(e.target.value)}
            rows={3}
            className="mt-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          {errors.finalConclusion ? (
            <p className="mt-1 text-sm text-red-700">{errors.finalConclusion}</p>
          ) : null}
          <button
            type="button"
            disabled={busy || ticket.visitLogCount < 1}
            onClick={() =>
              runAction({ action: "final_conclude", finalConclusion }, "Visit concluded — awaiting order.")
            }
            className="mt-3 rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Submit final conclusion
          </button>
        </section>
      ) : null}

      {(canOutcome || canMarkLostActive) && !readOnly ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Mark lost</h2>
          <input
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            placeholder="Why no order?"
            className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
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
        </section>
      ) : null}

      {ticket.linkedOrderId ? (
        <p className="text-sm">
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
          className={`text-sm font-semibold ${
            ticket.pointsAwarded >= 0 ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {ticket.pointsAwarded >= 0 ? "+" : ""}
          {ticket.pointsAwarded} points
        </p>
      )}

      <Link href="/field-visits" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← All field visits
      </Link>
    </div>
  );
}
