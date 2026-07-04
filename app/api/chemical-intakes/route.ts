import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { serializeChemicalIntake } from "@/lib/chemicalMaterials";
import { addIntakeToStock, resolveOrCreateMaterial } from "@/lib/chemicalStock";
import { connectToDatabase } from "@/lib/db";
import { ChemicalIntake } from "@/lib/models/ChemicalIntake";
import { parseQcOutcomeBody } from "@/lib/productionBatchQc";
import { canRecordChemicalIntake, canViewChemicalMaterials, roleFromSession } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canViewChemicalMaterials(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();
  const intakes = await ChemicalIntake.find().sort({ createdAt: -1 }).limit(50).lean();

  return NextResponse.json({
    intakes: intakes.map((i) => serializeChemicalIntake(i)),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canRecordChemicalIntake(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const materialName =
    typeof body.materialName === "string" ? body.materialName.trim() : "";
  const materialCode =
    typeof body.materialCode === "string" ? body.materialCode.trim().toLowerCase() : "";
  const quantity = Number(body.quantity);
  const unit = typeof body.unit === "string" && body.unit.trim() ? body.unit.trim() : "kg";
  const appearance = typeof body.appearance === "string" ? body.appearance.trim() : "";
  const ph = typeof body.ph === "string" ? body.ph.trim() : "";
  const solids = typeof body.solids === "string" ? body.solids.trim() : "";
  const provider = typeof body.provider === "string" ? body.provider.trim() : "";
  const lotNo = typeof body.lotNo === "string" ? body.lotNo.trim() : "";

  if (!materialName && !materialCode) {
    return NextResponse.json({ error: "Material name or code is required." }, { status: 400 });
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Quantity must be greater than 0." }, { status: 400 });
  }

  const qcParsed = parseQcOutcomeBody(body);
  if (!qcParsed.ok) {
    return NextResponse.json({ error: qcParsed.error }, { status: 400 });
  }

  let receivedAt = new Date();
  if (typeof body.receivedAt === "string" && body.receivedAt.trim()) {
    const d = new Date(body.receivedAt);
    if (!Number.isNaN(d.getTime())) receivedAt = d;
  }

  await connectToDatabase();
  const { material, created: createdMaterial } = await resolveOrCreateMaterial({
    materialCode: materialCode || undefined,
    materialName: materialName || materialCode,
    unit,
  });

  const userId = (session.user as { id?: string })?.id ?? "";
  const userName = session.user.name ?? "Esha";

  const intake = await ChemicalIntake.create({
    materialCode: material.code,
    materialName: material.name,
    quantity,
    unit: material.unit ?? unit,
    qcOutcome: qcParsed.outcome,
    qcComment: qcParsed.comment,
    appearance,
    ph,
    solids,
    provider,
    lotNo,
    receivedAt,
    recordedByUserId: userId,
    recordedByName: userName,
  });

  let updatedOnHand = material.onHand ?? 0;
  if (qcParsed.outcome === "approved") {
    const updated = await addIntakeToStock({
      materialCode: material.code,
      quantity,
      intakeId: String(intake._id),
      actor: { userId, name: userName },
      note: qcParsed.comment || undefined,
    });
    updatedOnHand = updated.onHand ?? 0;
  }

  return NextResponse.json(
    {
      intake: serializeChemicalIntake(intake),
      material: {
        code: material.code,
        name: material.name,
        onHand: updatedOnHand,
        unit: material.unit ?? unit,
      },
      createdMaterial,
    },
    { status: 201 },
  );
}
