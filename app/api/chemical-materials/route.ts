import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { canViewChemicalMaterials, serializeChemicalMaterial } from "@/lib/chemicalMaterials";
import { connectToDatabase } from "@/lib/db";
import { ChemicalRawMaterial } from "@/lib/models/ChemicalRawMaterial";
import { roleFromSession } from "@/lib/roles";

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
  const materials = await ChemicalRawMaterial.find({ active: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  return NextResponse.json(
    { materials: materials.map((m) => serializeChemicalMaterial(m)) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
