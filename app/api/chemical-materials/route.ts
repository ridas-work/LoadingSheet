import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  CHEMICAL_ACCESSORIES,
  canEditChemicalAccessoryStock,
  canEditChemicalStock,
  canViewChemicalMaterials,
  normalizeChemicalMaterialKind,
  serializeChemicalMaterial,
} from "@/lib/chemicalMaterials";
import { adminAdjustStock, resolveOrCreateMaterial } from "@/lib/chemicalStock";
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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });

  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    kind?: unknown;
    unit?: unknown;
    onHand?: unknown;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Material name is required." }, { status: 400 });
  }

  const kind = normalizeChemicalMaterialKind(body.kind);
  if (!canEditChemicalStock(role) && !(kind === "accessory" && canEditChemicalAccessoryStock(role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const accessoryDefinition =
    kind === "accessory"
      ? CHEMICAL_ACCESSORIES.find(
          (item) =>
            item.code === name.toLowerCase() || item.name.toLowerCase() === name.toLowerCase(),
        )
      : null;
  if (kind === "accessory" && !accessoryDefinition) {
    return NextResponse.json(
      { error: "Only Shoppers, Drums, and Seals can be added as accessory stock." },
      { status: 400 },
    );
  }

  const defaultUnit = kind === "accessory" ? "pcs" : "kg";
  const unit =
    accessoryDefinition?.unit ??
    (typeof body.unit === "string" && body.unit.trim() ? body.unit.trim() : defaultUnit);
  const materialName = accessoryDefinition?.name ?? name;
  const onHandRaw = body.onHand === undefined ? 0 : Number(body.onHand);
  if (!Number.isFinite(onHandRaw) || onHandRaw < 0) {
    return NextResponse.json({ error: "onHand must be a number ≥ 0." }, { status: 400 });
  }

  await connectToDatabase();
  const { material, created } = await resolveOrCreateMaterial({ materialName, kind, unit });

  const userId = (session.user as { id?: string })?.id ?? "";
  const userName = session.user.name ?? "User";

  let doc = material;
  if (!created) {
    return NextResponse.json(
      { error: `“${material.name}” is already in the catalog.` },
      { status: 409 },
    );
  }

  if (onHandRaw > 0) {
    doc = await adminAdjustStock({
      materialCode: material.code,
      newOnHand: onHandRaw,
      actor: { userId, name: userName },
      note: "Initial stock on add",
    });
  }

  return NextResponse.json({
    material: serializeChemicalMaterial(doc),
    created,
  });
}
