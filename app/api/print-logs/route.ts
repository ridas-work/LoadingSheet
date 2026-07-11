import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { PrintLog } from "@/lib/models/PrintLog";
import { serializePrintLog } from "@/lib/printLog";
import { isPrintDocumentType, type PrintLogInput } from "@/lib/printLog.types";

function parseBody(body: unknown): PrintLogInput | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  const documentType = raw.documentType;
  const documentTitle = typeof raw.documentTitle === "string" ? raw.documentTitle.trim() : "";
  if (!isPrintDocumentType(documentType) || !documentTitle) return null;

  const referenceId =
    typeof raw.referenceId === "string" && raw.referenceId.trim() ? raw.referenceId.trim() : undefined;
  const referencePath =
    typeof raw.referencePath === "string" && raw.referencePath.trim() ? raw.referencePath.trim() : undefined;

  let metadata: PrintLogInput["metadata"];
  if (raw.metadata && typeof raw.metadata === "object" && !Array.isArray(raw.metadata)) {
    metadata = raw.metadata as PrintLogInput["metadata"];
  }

  return {
    documentType,
    documentTitle,
    referenceId,
    referencePath,
    metadata,
  };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as { id?: string; name?: string; username?: string };
  const userId = user.id?.trim();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const input = parseBody(body);
  if (!input) {
    return NextResponse.json({ error: "Invalid print log payload" }, { status: 400 });
  }

  await connectToDatabase();

  const doc = await PrintLog.create({
    printedByUserId: userId,
    printedByName: user.name?.trim() || user.username?.trim() || "Unknown",
    printedByUsername: user.username?.trim().toLowerCase() || "unknown",
    documentType: input.documentType,
    documentTitle: input.documentTitle.slice(0, 500),
    referenceId: input.referenceId ?? null,
    referencePath: input.referencePath ?? null,
    metadata: input.metadata ?? {},
    printedAt: new Date(),
  });

  return NextResponse.json({ log: serializePrintLog(doc) }, { status: 201 });
}
