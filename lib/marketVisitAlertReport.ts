import { MARKET_VISIT_REP_USERNAMES } from "@/lib/fieldVisitTickets";
import { fetchOpenAlertsByStoreKeys } from "@/lib/marketVisitAlerts";
import type { MarketVisitGridReport, MarketVisitReportGridRow } from "@/lib/marketVisitAlertReport.types";
import { normalizeMarketStoreKey } from "@/lib/marketVisitStoreKey";
import { parseMarketVisitRow } from "@/lib/marketVisitTypes";
import { FieldVisitTicket } from "@/lib/models/FieldVisitTicket";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesStoreQuery(row: { storeName: string; location: string }, query: string): boolean {
  const re = new RegExp(escapeRegex(query), "i");
  return re.test(row.storeName) || re.test(row.location);
}

function repDisplayName(username: string, name: string): string {
  if (name.trim()) return name.trim();
  return username.charAt(0).toUpperCase() + username.slice(1);
}

export async function fetchDistinctMarketStoreNames(): Promise<string[]> {
  const tickets = await FieldVisitTicket.find({
    $or: [
      { visitKind: "market_audit" },
      { createdByUsername: { $in: [...MARKET_VISIT_REP_USERNAMES] } },
    ],
  })
    .select({ marketVisitRows: 1 })
    .lean();

  const names = new Set<string>();
  for (const ticket of tickets) {
    for (const raw of ticket.marketVisitRows ?? []) {
      const row = parseMarketVisitRow(raw);
      if (row?.storeName.trim()) names.add(row.storeName.trim());
    }
  }

  return [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export async function buildMarketVisitGridReport(args: {
  storeQuery?: string;
  limit?: number;
}): Promise<MarketVisitGridReport> {
  const storeQuery = args.storeQuery?.trim() ?? "";
  const limit = Math.min(Math.max(args.limit ?? 300, 1), 500);

  const tickets = await FieldVisitTicket.find({
    $or: [
      { visitKind: "market_audit" },
      { createdByUsername: { $in: [...MARKET_VISIT_REP_USERNAMES] } },
    ],
  })
    .sort({ marketVisitDate: -1, updatedAt: -1 })
    .select({
      marketVisitDate: 1,
      marketVisitRows: 1,
      createdByName: 1,
      createdByUsername: 1,
      createdAt: 1,
    })
    .lean();

  const gridRows: MarketVisitReportGridRow[] = [];

  for (const ticket of tickets) {
    const visitId = ticket._id.toString();
    const visitDate = ticket.marketVisitDate
      ? new Date(ticket.marketVisitDate).toISOString()
      : ticket.createdAt
        ? new Date(ticket.createdAt).toISOString()
        : null;
    const repUsername = (ticket.createdByUsername ?? "").toLowerCase();
    const repName = repDisplayName(repUsername, ticket.createdByName ?? "");

    const rawRows = ticket.marketVisitRows ?? [];
    for (let i = 0; i < rawRows.length; i++) {
      const parsed = parseMarketVisitRow(rawRows[i]);
      if (!parsed || !parsed.storeName.trim()) continue;
      if (storeQuery && !matchesStoreQuery(parsed, storeQuery)) continue;

      gridRows.push({
        storeName: parsed.storeName,
        location: parsed.location,
        availability: { ...parsed.availability },
        facingUnits: { ...parsed.facingUnits },
        remarks: parsed.remarks,
        rowKey: `${visitId}-${i}`,
        visitId,
        visitDate,
        repUsername,
        repName,
      });

      if (gridRows.length >= limit) break;
    }
    if (gridRows.length >= limit) break;
  }

  const storeKeys = [
    ...new Set(gridRows.map((row) => normalizeMarketStoreKey(row.storeName, row.location))),
  ];
  const openAlertsByStoreKey = await fetchOpenAlertsByStoreKeys(storeKeys);
  const storeNames = await fetchDistinctMarketStoreNames();

  return {
    rows: gridRows,
    storeNames,
    openAlertsByStoreKey,
    filteredStore: storeQuery,
  };
}

/** @deprecated Use buildMarketVisitGridReport */
export async function buildMarketVisitAlertHistory(args: {
  storeQuery?: string;
  limit?: number;
}) {
  return buildMarketVisitGridReport(args);
}
