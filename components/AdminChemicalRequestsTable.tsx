"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  ChemicalRequestAccessory,
  SerializedChemicalMaterial,
  SerializedChemicalRequest,
} from "@/lib/chemicalMaterials";
import { ui } from "@/lib/ui";

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

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

type RequestStockLine = {
  itemCode: string;
  itemName: string;
  requested: number;
  unit: string;
  onHandAtRequest: number;
};

function accessorySummary(accessories: ChemicalRequestAccessory[]) {
  const items = accessories
    .filter((item) => item.quantityRequested > 0)
    .map((item) => `${fmt(item.quantityRequested)} ${item.itemName || item.itemCode}`);
  return items.length > 0 ? items.join(", ") : "";
}

function requestStockLines(request: SerializedChemicalRequest): RequestStockLine[] {
  return [
    {
      itemCode: request.materialCode,
      itemName: request.materialName,
      requested: request.quantityRequested,
      unit: request.unit,
      onHandAtRequest: request.onHandAtRequest,
    },
    ...request.accessories
      .filter((item) => item.quantityRequested > 0)
      .map((item) => ({
        itemCode: item.itemCode,
        itemName: item.itemName || item.itemCode,
        requested: item.quantityRequested,
        unit: item.unit,
        onHandAtRequest: item.onHandAtRequest,
      })),
  ];
}

export function AdminChemicalRequestsTable() {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [requests, setRequests] = useState<SerializedChemicalRequest[]>([]);
  const [materials, setMaterials] = useState<SerializedChemicalMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const materialByCode = useMemo(() => {
    const map = new Map<string, SerializedChemicalMaterial>();
    for (const m of materials) map.set(m.code, m);
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
      if (!matRes.ok) throw new Error("Could not load current stock");
      const matData = (await matRes.json()) as { materials?: SerializedChemicalMaterial[] };
      setMaterials(matData.materials ?? []);
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
                const stockLines = requestStockLines(r);
                const accessoryLines = stockLines.slice(1);
                const shortageLines =
                  r.status === "pending"
                    ? stockLines
                        .map((line) => {
                          const material = materialByCode.get(line.itemCode);
                          if (!material || material.onHand >= line.requested) return null;
                          return { ...line, onHand: material.onHand };
                        })
                        .filter((line) => line != null)
                    : [];
                const chemicalStock = materialByCode.get(r.materialCode);
                const shortage = shortageLines.length > 0;
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-zinc-100 ${shortage ? "bg-red-50" : ""}`}
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.materialName}</div>
                      {accessorySummary(r.accessories) ? (
                        <div className="text-xs text-zinc-600">
                          Accessories: {accessorySummary(r.accessories)}
                        </div>
                      ) : null}
                      {r.note ? <div className="text-xs text-zinc-500">{r.note}</div> : null}
                      {shortage ? (
                        <div className="text-xs font-medium text-red-800">
                          Insufficient stock:{" "}
                          {shortageLines
                            .map(
                              (line) =>
                                `${line.itemName} stock is less (${fmt(line.onHand)} ${line.unit} on hand, ${fmt(line.requested)} ${line.unit} requested)`,
                            )
                            .join("; ")}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {fmt(r.quantityRequested)} {r.unit}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {chemicalStock ? (
                        <div
                          className={
                            chemicalStock.onHand < r.quantityRequested && r.status === "pending"
                              ? "font-semibold text-red-800"
                              : "text-zinc-900"
                          }
                        >
                          {fmt(chemicalStock.onHand)} {r.unit}
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                      {accessoryLines.map((line) => {
                        const material = materialByCode.get(line.itemCode);
                        const lineShortage =
                          r.status === "pending" && material && material.onHand < line.requested;
                        return (
                          <div
                            key={line.itemCode}
                            className={`text-xs ${lineShortage ? "font-semibold text-red-800" : "text-zinc-600"}`}
                          >
                            {line.itemName}: {material ? fmt(material.onHand) : "—"} {line.unit}
                          </div>
                        );
                      })}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-600">
                      <div>
                        {fmt(r.onHandAtRequest)} {r.unit}
                      </div>
                      {accessoryLines.map((line) => (
                        <div key={line.itemCode} className="text-xs">
                          {line.itemName}: {fmt(line.onHandAtRequest)} {line.unit}
                        </div>
                      ))}
                    </td>
                    <td className="px-3 py-2">{r.requestedByName}</td>
                    <td className="px-3 py-2">{statusBadge(r.status)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {r.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              disabled={acting === r.id || shortage}
                              onClick={() => act(r.id, "approve")}
                              className={ui.btnPrimaryXs}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={acting === r.id}
                              onClick={() => act(r.id, "reject")}
                              className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-800 ring-1 ring-red-200 disabled:opacity-50"
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
