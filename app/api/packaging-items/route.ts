import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { PackagingItem } from "@/lib/models/PackagingItem";
import {
  canEditPackagingInventory,
  canViewPackagingInventory,
  isPackagingCategory,
  serializePackagingItem,
  slugifyPackagingCode,
} from "@/lib/packagingInventory";
import { roleFromSession } from "@/lib/roles";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canViewPackagingInventory(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const category = url.searchParams.get("category")?.trim().toLowerCase();

  await connectToDatabase();

  const filter: Record<string, unknown> = { active: true };
  if (category) filter.category = category;

  const items = await PackagingItem.find(filter).sort({ category: 1, name: 1 }).lean();

  return NextResponse.json({
    items: items.map((item) => serializePackagingItem(item)),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canEditPackagingInventory(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    code?: unknown;
    name?: unknown;
    category?: unknown;
    deductAs?: unknown;
    linkedProductCode?: unknown;
    linkedBatchFamily?: unknown;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Material name is required." }, { status: 400 });
  }

  const codeRaw = typeof body.code === "string" ? body.code : name;
  const code = slugifyPackagingCode(codeRaw);
  if (!code) {
    return NextResponse.json({ error: "Material code is required." }, { status: 400 });
  }

  const category = typeof body.category === "string" ? body.category.trim().toLowerCase() : "";
  if (!isPackagingCategory(category)) {
    return NextResponse.json({ error: "Choose a valid material type." }, { status: 400 });
  }

  const deductRaw = typeof body.deductAs === "string" ? body.deductAs.trim().toLowerCase() : category;
  const deductAs = isPackagingCategory(deductRaw) ? deductRaw : category;

  const linkedProductCode =
    typeof body.linkedProductCode === "string" ? slugifyPackagingCode(body.linkedProductCode) : "";
  const linkedBatchFamily =
    typeof body.linkedBatchFamily === "string" ? body.linkedBatchFamily.trim() : "";

  await connectToDatabase();

  const existing = await PackagingItem.findOne({ code }).lean();
  if (existing) {
    return NextResponse.json({ error: `Material code "${code}" already exists.` }, { status: 400 });
  }

  const maxSort = await PackagingItem.findOne({ active: true }).sort({ sortOrder: -1 }).select({ sortOrder: 1 }).lean();
  const sortOrder = (typeof maxSort?.sortOrder === "number" ? maxSort.sortOrder : 0) + 1;

  const item = await PackagingItem.create({
    code,
    name,
    category,
    deductAs,
    sortOrder,
    linkedProductCode,
    linkedBatchFamily: linkedBatchFamily.toLowerCase(),
    purchasedQty: 0,
    rejectedDamage: 0,
    uip: 0,
    onHand: 0,
    active: true,
  });

  return NextResponse.json({ item: serializePackagingItem(item) }, { status: 201 });
}
