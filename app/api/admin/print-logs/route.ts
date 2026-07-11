import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { PrintLog } from "@/lib/models/PrintLog";
import { serializePrintLog } from "@/lib/printLog";
import { isPrintDocumentType } from "@/lib/printLog.types";
import { isAdmin, roleFromSession } from "@/lib/roles";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const username = url.searchParams.get("username")?.trim().toLowerCase() ?? "";
  const documentType = url.searchParams.get("documentType")?.trim() ?? "";
  const from = url.searchParams.get("from")?.trim() ?? "";
  const to = url.searchParams.get("to")?.trim() ?? "";
  const limitRaw = Number(url.searchParams.get("limit") ?? "200");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;

  const filter: Record<string, unknown> = {};
  if (username) filter.printedByUsername = username;
  if (documentType && isPrintDocumentType(documentType)) filter.documentType = documentType;

  if (from || to) {
    const printedAt: Record<string, Date> = {};
    if (from) {
      const start = new Date(`${from}T00:00:00.000`);
      if (!Number.isNaN(start.getTime())) printedAt.$gte = start;
    }
    if (to) {
      const end = new Date(`${to}T23:59:59.999`);
      if (!Number.isNaN(end.getTime())) printedAt.$lte = end;
    }
    if (Object.keys(printedAt).length > 0) filter.printedAt = printedAt;
  }

  await connectToDatabase();

  const docs = await PrintLog.find(filter).sort({ printedAt: -1 }).limit(limit).lean();

  return NextResponse.json({
    logs: docs.map((doc) =>
      serializePrintLog({
        ...doc,
        _id: doc._id,
        printedAt: doc.printedAt,
      } as Parameters<typeof serializePrintLog>[0]),
    ),
  });
}
