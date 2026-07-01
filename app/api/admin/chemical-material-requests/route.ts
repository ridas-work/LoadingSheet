import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { serializeChemicalRequest } from "@/lib/chemicalMaterials";
import { connectToDatabase } from "@/lib/db";
import { ChemicalMaterialRequest } from "@/lib/models/ChemicalMaterialRequest";
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
  const statusParam = url.searchParams.get("status")?.trim() || "pending";

  await connectToDatabase();
  const filter =
    statusParam === "all"
      ? {}
      : { status: statusParam as "pending" | "approved" | "ordered" | "rejected" };
  const [requests, pendingCount] = await Promise.all([
    ChemicalMaterialRequest.find(filter).sort({ createdAt: -1 }).limit(100).lean(),
    ChemicalMaterialRequest.countDocuments({ status: "pending" }),
  ]);

  return NextResponse.json({
    requests: requests.map((r) => serializeChemicalRequest(r)),
    pendingCount,
  });
}
