/**
 * PO creators enter total bottles; full cartons are derived from catalog packing.
 */

export type BottleToCartonResult =
  | { ok: true; cartons: number; bottlesPerBox: number }
  | { ok: false; message: string };

export function bottlesToStandardCartons(
  totalBottles: number,
  bottlesPerCarton: number,
  productLabel?: string,
): BottleToCartonResult {
  if (!Number.isInteger(totalBottles) || totalBottles < 1) {
    return { ok: false, message: "Enter a whole number of bottles (1 or more)." };
  }
  if (!Number.isInteger(bottlesPerCarton) || bottlesPerCarton < 1) {
    return { ok: false, message: "Invalid bottles per carton for this product." };
  }
  if (totalBottles % bottlesPerCarton !== 0) {
    const label = productLabel ? `${productLabel}: ` : "";
    return {
      ok: false,
      message: `${label}${totalBottles} bottles is not a full carton (${bottlesPerCarton} bottles per carton). Use **Add custom carton** for this quantity.`,
    };
  }
  const cartons = totalBottles / bottlesPerCarton;
  return { ok: true, cartons, bottlesPerBox: bottlesPerCarton };
}

/** Preview cartons for UI (null if not an exact multiple). */
export function previewCartonsFromBottles(
  bottlesRaw: string,
  bottlesPerCarton: number,
): number | null {
  const bottles = Number(bottlesRaw.trim());
  if (!Number.isInteger(bottles) || bottles < 1) return null;
  if (!Number.isInteger(bottlesPerCarton) || bottlesPerCarton < 1) return null;
  if (bottles % bottlesPerCarton !== 0) return null;
  return bottles / bottlesPerCarton;
}
