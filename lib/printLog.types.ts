export const PRINT_DOCUMENT_TYPES = [
  "order_loading_sheet",
  "trip_loading_sheet",
  "trip_batch_assignment",
  "carton_labels",
  "admin_report",
  "admin_summary",
  "market_visit",
] as const;

export type PrintDocumentType = (typeof PRINT_DOCUMENT_TYPES)[number];

export type PrintLogInput = {
  documentType: PrintDocumentType;
  documentTitle: string;
  referenceId?: string;
  referencePath?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type SerializedPrintLog = {
  id: string;
  printedByUserId: string;
  printedByName: string;
  printedByUsername: string;
  documentType: PrintDocumentType;
  documentTitle: string;
  referenceId: string | null;
  referencePath: string | null;
  metadata: Record<string, string | number | boolean | null>;
  printedAt: string;
};

export const PRINT_DOCUMENT_TYPE_LABELS: Record<PrintDocumentType, string> = {
  order_loading_sheet: "Order loading sheet",
  trip_loading_sheet: "Trip loading sheet",
  trip_batch_assignment: "Trip batch assignment",
  carton_labels: "Carton labels",
  admin_report: "Operations report",
  admin_summary: "Admin summary",
  market_visit: "Market visit",
};

export function isPrintDocumentType(value: unknown): value is PrintDocumentType {
  return typeof value === "string" && PRINT_DOCUMENT_TYPES.includes(value as PrintDocumentType);
}
