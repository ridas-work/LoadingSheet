import type { PrintLogDoc } from "@/lib/models/PrintLog";
import type { SerializedPrintLog } from "@/lib/printLog.types";

export function serializePrintLog(doc: PrintLogDoc): SerializedPrintLog {
  const metadata =
    doc.metadata && typeof doc.metadata === "object" && !Array.isArray(doc.metadata)
      ? (doc.metadata as Record<string, string | number | boolean | null>)
      : {};

  return {
    id: doc._id.toString(),
    printedByUserId: doc.printedByUserId,
    printedByName: doc.printedByName,
    printedByUsername: doc.printedByUsername,
    documentType: doc.documentType,
    documentTitle: doc.documentTitle,
    referenceId: doc.referenceId ?? null,
    referencePath: doc.referencePath ?? null,
    metadata,
    printedAt: doc.printedAt.toISOString(),
  };
}
