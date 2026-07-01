import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { serializeChemicalRequest } from "@/lib/chemicalMaterials";
import { deductForApprovedRequest, validateStockForApprove } from "@/lib/chemicalStock";
import { connectToDatabase } from "@/lib/db";
import { ChemicalMaterialRequest } from "@/lib/models/ChemicalMaterialRequest";
import { ChemicalRawMaterial } from "@/lib/models/ChemicalRawMaterial";
import type { ChemicalRequestStatus } from "@/lib/models/ChemicalMaterialRequest";
import { isAdmin, roleFromSession } from "@/lib/roles";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = typeof body?.action === "string" ? body.action.trim() : "";
  const adminNote = typeof body?.adminNote === "string" ? body.adminNote.trim() : "";

  if (!["approve", "reject", "mark_ordered"].includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  await connectToDatabase();
  const doc = await ChemicalMaterialRequest.findById(id);
  if (!doc) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const reviewer = session.user.name ?? "Admin";
  const now = new Date();
  const userId = (session.user as { id?: string })?.id ?? "";

  let nextStatus: ChemicalRequestStatus | null = null;
  if (action === "approve" && doc.status === "pending") {
    nextStatus = "approved";
  } else if (action === "reject" && doc.status === "pending") {
    nextStatus = "rejected";
  } else if (action === "mark_ordered" && doc.status === "approved") {
    nextStatus = "ordered";
  } else {
    return NextResponse.json(
      { error: `Cannot ${action} from status "${doc.status}".` },
      { status: 400 },
    );
  }

  let onHandAfter: number | undefined;

  if (nextStatus === "approved") {
    const material = await ChemicalRawMaterial.findOne({
      code: doc.materialCode,
      active: true,
    }).lean();
    if (!material) {
      return NextResponse.json({ error: "Material not found in catalog." }, { status: 404 });
    }
    const check = validateStockForApprove(
      { onHand: material.onHand ?? 0, unit: material.unit ?? "kg" },
      doc.quantityRequested,
    );
    if (!check.ok) {
      return NextResponse.json(
        { error: check.error, onHand: check.onHand, requested: check.requested },
        { status: 400 },
      );
    }

    doc.status = nextStatus;
    doc.reviewedByName = reviewer;
    doc.reviewedAt = now;
    if (adminNote) doc.adminNote = adminNote;
    await doc.save();

    try {
      const result = await deductForApprovedRequest({
        request: doc,
        actor: { userId, name: reviewer },
      });
      onHandAfter = result.material.onHand ?? 0;
    } catch (e) {
      doc.status = "pending";
      doc.reviewedByName = "";
      doc.reviewedAt = null;
      await doc.save();
      const msg = e instanceof Error ? e.message : "Stock deduction failed.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  } else {
    doc.status = nextStatus;
    doc.reviewedByName = reviewer;
    doc.reviewedAt = now;
    if (adminNote) doc.adminNote = adminNote;
    if (nextStatus === "ordered") doc.orderedAt = now;
    await doc.save();
  }

  return NextResponse.json({
    request: serializeChemicalRequest(doc),
    onHandAfter,
  });
}
