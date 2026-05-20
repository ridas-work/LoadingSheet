import { inferLitersPerBottleFromName } from "@/lib/batchVolume";

export type ProductPackingCreateInput = {
  code: string;
  name: string;
  bottlesPerCarton: number;
  litersPerBottle: number;
  batchFamily: string;
  summaryLabel: string;
};

const CODE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseProductPackingCreateBody(raw: unknown):
  | { ok: true; value: ProductPackingCreateInput }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Body must be a JSON object" };
  }
  const body = raw as Record<string, unknown>;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return { ok: false, error: "Name is required" };
  }

  const codeRaw = typeof body.code === "string" ? body.code.trim().toLowerCase() : "";
  if (!codeRaw) {
    return { ok: false, error: "Code is required" };
  }
  if (!CODE_RE.test(codeRaw)) {
    return { ok: false, error: "Code must be a slug: lowercase letters, digits, and hyphens only" };
  }

  const bpc =
    typeof body.bottlesPerCarton === "number"
      ? body.bottlesPerCarton
      : typeof body.bottlesPerCarton === "string"
        ? Number(body.bottlesPerCarton)
        : NaN;
  if (!Number.isInteger(bpc) || bpc < 1) {
    return { ok: false, error: "Bottles per carton must be a whole number ≥ 1" };
  }

  let litersPerBottle: number;
  if (body.litersPerBottle === undefined || body.litersPerBottle === null || body.litersPerBottle === "") {
    litersPerBottle = inferLitersPerBottleFromName(name, undefined);
  } else {
    const lp =
      typeof body.litersPerBottle === "number"
        ? body.litersPerBottle
        : typeof body.litersPerBottle === "string"
          ? Number(body.litersPerBottle)
          : NaN;
    if (!Number.isFinite(lp) || lp <= 0) {
      return { ok: false, error: "Liters per bottle must be a number greater than 0" };
    }
    litersPerBottle = inferLitersPerBottleFromName(name, lp);
  }
  if (!Number.isFinite(litersPerBottle) || litersPerBottle < 0.001) {
    return { ok: false, error: "Liters per bottle must be at least 0.001" };
  }

  const batchFamilyRaw = typeof body.batchFamily === "string" ? body.batchFamily.trim() : "";
  const batchFamily = batchFamilyRaw || name;

  const summaryLabel = name.length > 24 ? `${name.slice(0, 22)}…` : name;

  return {
    ok: true,
    value: {
      code: codeRaw,
      name,
      bottlesPerCarton: bpc,
      litersPerBottle,
      batchFamily,
      summaryLabel,
    },
  };
}
