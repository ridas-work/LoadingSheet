import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  canRequestChemicalMaterials,
  serializeChemicalRequest,
} from "@/lib/chemicalMaterials";
import { connectToDatabase } from "@/lib/db";
import { ChemicalMaterialRequest } from "@/lib/models/ChemicalMaterialRequest";
import { ChemicalRawMaterial } from "@/lib/models/ChemicalRawMaterial";
import { roleFromSession } from "@/lib/roles";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canRequestChemicalMaterials(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const mineOnly = url.searchParams.get("mine") !== "0";
  const username = ((session.user as { username?: string })?.username ?? "").toLowerCase();

  await connectToDatabase();
  const filter = mineOnly && username ? { requestedByUsername: username } : {};
  const requests = await ChemicalMaterialRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({
    requests: requests.map((r) => serializeChemicalRequest(r)),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canRequestChemicalMaterials(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const materialCode =
    typeof body.materialCode === "string" ? body.materialCode.trim().toLowerCase() : "";
  const quantityRequested = Number(body.quantityRequested);
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!materialCode) {
    return NextResponse.json({ error: "materialCode is required." }, { status: 400 });
  }
  if (!Number.isFinite(quantityRequested) || quantityRequested <= 0) {
    return NextResponse.json({ error: "quantityRequested must be greater than 0." }, { status: 400 });
  }

  await connectToDatabase();
  const material = await ChemicalRawMaterial.findOne({ code: materialCode, active: true }).lean();
  if (!material) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }

  const userId = (session.user as { id?: string })?.id ?? "";
  const userName = session.user.name ?? "Ramazan";
  const username = ((session.user as { username?: string })?.username ?? "").toLowerCase();

  const doc = await ChemicalMaterialRequest.create({
    materialCode: material.code,
    materialName: material.name,
    quantityRequested,
    unit: material.unit ?? "kg",
    onHandAtRequest: material.onHand ?? 0,
    status: "pending",
    note,
    requestedByUserId: userId,
    requestedByName: userName,
    requestedByUsername: username,
  });

  return NextResponse.json({ request: serializeChemicalRequest(doc) }, { status: 201 });
}
