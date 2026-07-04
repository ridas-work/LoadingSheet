import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  canEditChemicalAccessoryStock,
  canEditChemicalStock,
  findChemicalAccessory,
  serializeChemicalMaterial,
} from "@/lib/chemicalMaterials";
import { adminAdjustStock } from "@/lib/chemicalStock";
import { connectToDatabase } from "@/lib/db";
import { ChemicalRawMaterial } from "@/lib/models/ChemicalRawMaterial";
import { roleFromSession } from "@/lib/roles";

type RouteCtx = { params: Promise<{ code: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });

  const { code } = await ctx.params;
  const materialCode = code.trim().toLowerCase();
  const body = (await req.json().catch(() => null)) as { onHand?: unknown; note?: unknown } | null;
  if (!body || body.onHand === undefined) {
    return NextResponse.json({ error: "onHand is required." }, { status: 400 });
  }

  const onHand = Number(body.onHand);
  if (!Number.isFinite(onHand) || onHand < 0) {
    return NextResponse.json({ error: "onHand must be a number ≥ 0." }, { status: 400 });
  }

  const note = typeof body.note === "string" ? body.note.trim() : "";

  await connectToDatabase();
  const exists = await ChemicalRawMaterial.findOne({ code: materialCode, active: true }).lean();
  if (!exists) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }
  const fixedAccessory = exists.kind === "accessory" && !!findChemicalAccessory(materialCode);
  if (!canEditChemicalStock(role) && !(fixedAccessory && canEditChemicalAccessoryStock(role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as { id?: string })?.id ?? "";
  const userName = session.user.name ?? "User";

  const doc = await adminAdjustStock({
    materialCode,
    newOnHand: onHand,
    actor: { userId, name: userName },
    note: note || undefined,
  });

  return NextResponse.json({ material: serializeChemicalMaterial(doc) });
}
