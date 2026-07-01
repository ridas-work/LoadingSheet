"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { SerializedChemicalMaterial, SerializedChemicalRequest } from "@/lib/chemicalMaterials";
import { ui } from "@/lib/ui";

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return <span className={ui.badgeWarning}>Pending</span>;
    case "approved":
      return <span className={ui.badgeInfo}>Approved</span>;
    case "ordered":
      return <span className={ui.badgeSuccess}>Ordered</span>;
    case "rejected":
      return <span className={ui.badgeDanger}>Rejected</span>;
    default:
      return <span className={ui.badgeNeutral}>{status}</span>;
  }
}

export function AdminChemicalRequestsTable() {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [requests, setRequests] = useState<SerializedChemicalRequest[]>([]);
  const [materials, setMaterials] = useState<SerializedChemicalMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const onHandByCode = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of materials) map.set(m.code, m.onHand);
    return map;
  }, [materials]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [reqRes, matRes] = await Promise.all([
        fetch(
          `/api/admin/chemical-material-requests?status=${tab === "pending" ? "pending" : "all"}`,
          { credentials: "same-origin" },
        ),
        fetch("/api/chemical-materials", { credentials: "same-origin" }),
      ]);
      if (!reqRes.ok) throw new Error("Could not load requests");
      const reqData = (await reqRes.json()) as { requests?: SerializedChemicalRequest[] };
      setRequests(reqData.requests ?? []);
      if (matRes.ok) {
        const matData = (await matRes.json()) as { materials?: SerializedChemicalMaterial[] };
        setMaterials(matData.materials ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, action: "approve" | "reject" | "mark_ordered") {
    setActing(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/chemical-material-requests/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Action failed");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("pending")}
          className={tab === "pending" ? ui.btnPrimarySm : ui.btnSecondarySm}
        >
          Pending
        </button>
        <button
          type="button"
          onClick={() => setTab("all")}
          className={tab === "all" ? ui.btnPrimarySm : ui.btnSecondarySm}
        >
          All recent
        </button>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-zinc-600">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-zinc-600">No requests in this view.</p>
      ) : (
        <div className={`${ui.card} overflow-x-auto p-0`}>
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-600">
                <th className="border-b px-3 py-2">Material</th>
                <th className="border-b px-3 py-2 text-right">Requested</th>
                <th className="border-b px-3 py-2 text-right">Stock now</th>
                <th className="border-b px-3 py-2 text-right">Stock at request</th>
                <th className="border-b px-3 py-2">By</th>
                <th className="border-b px-3 py-2">Status</th>
                <th className="border-b px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const onHand = onHandByCode.get(r.materialCode) ?? null;
                const shortage =
                  r.status === "pending" &&
                  onHand != null &&
                  onHand < r.quantityRequested;
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-zinc-100 ${shortage ? "bg-red-50" : ""}`}
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.materialName}</div>
                      {r.note ? <div className="text-xs text-zinc-500">{r.note}</div> : null}
                      {shortage ? (
                        <div className="text-xs font-medium text-red-800">
                          Insufficient stock to approve
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.quantityRequested.toLocaleString()} {r.unit}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {onHand != null ? (
                        <span className={shortage ? "font-semibold text-red-800" : "text-zinc-900"}>
                          {onHand.toLocaleString()} {r.unit}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-600">
                      {r.onHandAtRequest.toLocaleString()} {r.unit}
                    </td>
                    <td className="px-3 py-2">{r.requestedByName}</td>
                    <td className="px-3 py-2">{statusBadge(r.status)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {r.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              disabled={acting === r.id}
                              onClick={() => act(r.id, "approve")}
                              className={ui.btnPrimaryXs}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={acting === r.id}
                              onClick={() => act(r.id, "reject")}
                              className={ui.btnGhost}
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                        {r.status === "approved" ? (
                          <button
                            type="button"
                            disabled={acting === r.id}
                            onClick={() => act(r.id, "mark_ordered")}
                            className={ui.btnSecondarySm}
                          >
                            Mark ordered
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
