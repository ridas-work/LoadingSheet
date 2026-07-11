import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  CHEMICAL_ACCESSORY_CODES,
  canRequestChemicalMaterials,
  findChemicalAccessory,
  serializeChemicalRequest,
} from "@/lib/chemicalMaterials";
import { connectToDatabase } from "@/lib/db";
import { ChemicalMaterialRequest } from "@/lib/models/ChemicalMaterialRequest";
import { ChemicalRawMaterial } from "@/lib/models/ChemicalRawMaterial";
import { roleFromSession } from "@/lib/roles";

type ParsedAccessoryInput = {
  itemCode: string;
  quantityRequested: number;
};

function parseAccessoryInputs(input: unknown):
  | { ok: true; accessories: ParsedAccessoryInput[] }
  | { ok: false; error: string } {
  if (input === undefined || input === null) {
    return { ok: true, accessories: [] };
  }
  if (!Array.isArray(input)) {
    return { ok: false, error: "accessories must be an array when provided." };
  }

  const byCode = new Map<string, ParsedAccessoryInput>();
  for (const rawItem of input) {
    const item = rawItem as Record<string, unknown> | null;
    const codeRaw =
      typeof item?.itemCode === "string"
        ? item.itemCode
        : typeof item?.code === "string"
          ? item.code
          : "";
    const itemCode = codeRaw.trim().toLowerCase();
    const definition = findChemicalAccessory(itemCode);
    if (!definition) {
      return {
        ok: false,
        error: `Unknown accessory code "${itemCode}". Allowed accessory codes: ${CHEMICAL_ACCESSORY_CODES.join(", ")}.`,
      };
    }

    const quantityRaw =
      item?.quantityRequested !== undefined ? item.quantityRequested : item?.quantity;
    const quantityRequested = Number(quantityRaw);
    if (!Number.isFinite(quantityRequested) || quantityRequested <= 0) {
      return {
        ok: false,
        error: `${definition.name} quantityRequested must be greater than 0.`,
      };
    }

    const existing = byCode.get(itemCode);
    if (existing) {
      existing.quantityRequested += quantityRequested;
    } else {
      byCode.set(itemCode, { itemCode, quantityRequested });
    }
  }

  return { ok: true, accessories: Array.from(byCode.values()) };
}

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
  const parsedAccessories = parseAccessoryInputs(body.accessories);

  if (!materialCode) {
    return NextResponse.json({ error: "materialCode is required." }, { status: 400 });
  }
  if (!Number.isFinite(quantityRequested) || quantityRequested <= 0) {
    return NextResponse.json({ error: "quantityRequested must be greater than 0." }, { status: 400 });
  }
  if (!parsedAccessories.ok) {
    return NextResponse.json({ error: parsedAccessories.error }, { status: 400 });
  }

  await connectToDatabase();
  const material = await ChemicalRawMaterial.findOne({
    code: materialCode,
    active: true,
  }).lean();
  if (!material) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }

  const accessoryCodes = parsedAccessories.accessories.map((item) => item.itemCode);
  const accessoryMaterials =
    accessoryCodes.length > 0
      ? await ChemicalRawMaterial.find({
          code: { $in: accessoryCodes },
          kind: "accessory",
          active: true,
        }).lean()
      : [];
  const accessoryByCode = new Map(accessoryMaterials.map((item) => [String(item.code), item]));
  const accessories = [];
  for (const item of parsedAccessories.accessories) {
    const definition = findChemicalAccessory(item.itemCode);
    const stock = accessoryByCode.get(item.itemCode);
    if (!definition || !stock) {
      return NextResponse.json(
        {
          error: `Accessory stock row not found for ${definition?.name ?? item.itemCode}. Add it to chemical stock first.`,
        },
        { status: 404 },
      );
    }
    accessories.push({
      itemCode: item.itemCode,
      itemName: stock.name ?? definition.name,
      quantityRequested: item.quantityRequested,
      unit: stock.unit ?? definition.unit,
      onHandAtRequest: stock.onHand ?? 0,
    });
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
    accessories,
    status: "pending",
    note,
    requestedByUserId: userId,
    requestedByName: userName,
    requestedByUsername: username,
  });

  return NextResponse.json({ request: serializeChemicalRequest(doc) }, { status: 201 });
}
