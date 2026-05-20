/**
 * Batch families where Nimra records optional **viscosity** on production batches
 * (liquid QC — not required for Fabrito, Titan, Washout, Degrease, etc.).
 */
const VISCOSITY_BATCH_FAMILIES = new Set(
  ["rhino", "brighten", "power wash", "hand sanitizer"].map((s) => s.toLowerCase()),
);

export function isViscosityApplicableBatchFamily(productNameOrFamily: string): boolean {
  const key = productNameOrFamily.trim().toLowerCase();
  return VISCOSITY_BATCH_FAMILIES.has(key);
}

/** @deprecated Use isViscosityApplicableBatchFamily */
export function isRhinoBatchFamily(productName: string): boolean {
  return isViscosityApplicableBatchFamily(productName);
}
