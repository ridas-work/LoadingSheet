import type { MarketVisitRow } from "@/lib/marketVisitTypes";

export type MarketVisitReportGridRow = MarketVisitRow & {
  rowKey: string;
  visitId: string;
  visitDate: string | null;
  repUsername: string;
  repName: string;
};

export type MarketVisitGridReport = {
  rows: MarketVisitReportGridRow[];
  storeNames: string[];
  openAlertsByStoreKey: Record<string, string[]>;
  filteredStore: string;
};
