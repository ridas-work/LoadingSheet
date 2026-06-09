import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { applyReadyBottleDelta } from "@/lib/readyBottleLedger";
import { canEditDispatch, roleFromSession } from "@/lib/roles";

export async function PATCH(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = roleFromSession(session.user as { role?: string });
  if (!canEditDispatch(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code: rawCode } = await ctx.params;
  const productCode = rawCode.trim().toLowerCase();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const delta = Number(body?.delta);
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (!Number.isInteger(delta) || delta === 0) {
    return NextResponse.json({ error: "delta must be a non-zero integer." }, { status: 400 });
  }
  if (!note) return NextResponse.json({ error: "Note is required for manual adjustment." }, { status: 400 });

  await connectToDatabase();
  const packing = await ProductPacking.findOne({ code: productCode, active: true }).lean();
  if (!packing) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const err = await applyReadyBottleDelta({
    productCode,
    productName: packing.name,
    delta,
    reason: "manual_adjust",
    note,
    audit: { userId, userName: session.user.name ?? "" },
  });
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  return NextResponse.json({ ok: true });
}
