export type ReadyStockLotRow = {
  id: string;
  batchNo: string;
  productCode: string;
  productName: string;
  bottles: number;
  note: string;
  bundleCode?: string;
  bundleSetId?: string;
  createdAt?: string | null;
};

export type BundleCatalogRow = {
  code: string;
  name: string;
  bundleComponents?: Array<{ code: string; name: string; bottlesPerUnit: number }>;
};

export type ReadyStockDisplayRow =
  | {
      kind: "single";
      lot: ReadyStockLotRow;
      /** When part of this lot is shown in a bundle row above. */
      bottlesOnHand: number;
    }
  | {
      kind: "bundle";
      bundleSetId: string;
      bundleCode: string;
      bundleName: string;
      bundleSets: number;
      components: Array<{
        lotId: string;
        productCode: string;
        productName: string;
        batchNo: string;
        bottlesUsed: number;
        bottlesPerUnit: number;
      }>;
    };

function isMultiProductBundle(item: BundleCatalogRow): boolean {
  const codes = new Set((item.bundleComponents ?? []).map((c) => c.code.trim().toLowerCase()));
  return codes.size >= 2;
}

function bundleSetsFromUsage(
  components: Array<{ code: string; bottlesPerUnit: number }>,
  usage: Map<string, number>,
): number {
  let sets = Infinity;
  for (const comp of components) {
    const used = usage.get(comp.code.trim().toLowerCase()) ?? 0;
    if (comp.bottlesPerUnit <= 0 || used <= 0) return 0;
    sets = Math.min(sets, Math.floor(used / comp.bottlesPerUnit));
  }
  return sets === Infinity ? 0 : sets;
}

function buildBundleDisplayRow(
  bundleSetId: string,
  bundle: BundleCatalogRow,
  picks: Array<{
    lot: ReadyStockLotRow;
    comp: { code: string; name: string; bottlesPerUnit: number };
    bottlesUsed: number;
  }>,
): Extract<ReadyStockDisplayRow, { kind: "bundle" }> | null {
  if (picks.length < 2) return null;
  const usage = new Map<string, number>();
  for (const pick of picks) {
    const key = pick.comp.code.trim().toLowerCase();
    usage.set(key, (usage.get(key) ?? 0) + pick.bottlesUsed);
  }
  const sets = bundleSetsFromUsage(
    picks.map((p) => ({ code: p.comp.code, bottlesPerUnit: p.comp.bottlesPerUnit })),
    usage,
  );
  if (sets <= 0) return null;

  return {
    kind: "bundle",
    bundleSetId,
    bundleCode: bundle.code,
    bundleName: bundle.name,
    bundleSets: sets,
    components: picks.map((pick) => ({
      lotId: pick.lot.id,
      productCode: pick.lot.productCode,
      productName: pick.comp.name || pick.lot.productName,
      batchNo: pick.lot.batchNo,
      bottlesUsed: pick.bottlesUsed,
      bottlesPerUnit: pick.comp.bottlesPerUnit,
    })),
  };
}

function consumeBundleRow(row: Extract<ReadyStockDisplayRow, { kind: "bundle" }>, remaining: Map<string, number>) {
  for (const comp of row.components) {
    const left = remaining.get(comp.lotId) ?? 0;
    remaining.set(comp.lotId, Math.max(0, left - comp.bottlesUsed));
  }
}

function bundleNoteKey(bundleName: string): string {
  return `Bundle ready stock (${bundleName})`;
}

function pickBundleByNote(
  bundle: BundleCatalogRow,
  lots: ReadyStockLotRow[],
  remaining: Map<string, number>,
): Extract<ReadyStockDisplayRow, { kind: "bundle" }> | null {
  const components = bundle.bundleComponents ?? [];
  if (components.length < 2) return null;

  const note = bundleNoteKey(bundle.name);
  const anchored = lots
    .filter((l) => (remaining.get(l.id) ?? 0) > 0 && (l.note ?? "").includes(note))
    .sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return ta - tb;
    });
  if (!anchored.length) return null;

  for (const anchor of anchored) {
    const anchorComp = components.find(
      (c) => c.code.trim().toLowerCase() === anchor.productCode.trim().toLowerCase(),
    );
    if (!anchorComp || anchorComp.bottlesPerUnit <= 0) continue;

    const anchorSetId = anchor.bundleSetId?.trim() ?? "";
    const picks: Array<{
      lot: ReadyStockLotRow;
      comp: { code: string; name: string; bottlesPerUnit: number };
      bottlesUsed: number;
    }> = [];

    for (const comp of components) {
      const key = comp.code.trim().toLowerCase();
      const candidates = lots
        .filter((l) => {
          if (l.productCode.trim().toLowerCase() !== key) return false;
          if ((remaining.get(l.id) ?? 0) <= 0) return false;
          if (!(l.note ?? "").includes(note)) return false;
          if (anchorSetId) return (l.bundleSetId?.trim() ?? "") === anchorSetId;
          return true;
        })
        .sort((a, b) => {
          const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
          const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
          return ta - tb;
        });

      const lot = key === anchor.productCode.trim().toLowerCase() ? anchor : candidates[0];
      if (!lot) {
        picks.length = 0;
        break;
      }

      const avail = remaining.get(lot.id) ?? 0;
      if (avail < comp.bottlesPerUnit) {
        picks.length = 0;
        break;
      }

      picks.push({ lot, comp, bottlesUsed: 0 });
    }

    if (picks.length !== components.length) continue;

    let maxSets = Infinity;
    for (const pick of picks) {
      const avail = remaining.get(pick.lot.id) ?? 0;
      maxSets = Math.min(maxSets, Math.floor(avail / pick.comp.bottlesPerUnit));
    }
    if (!Number.isFinite(maxSets) || maxSets <= 0) continue;

    for (const pick of picks) {
      pick.bottlesUsed = maxSets * pick.comp.bottlesPerUnit;
    }

    const setId =
      anchorSetId ||
      picks
        .map((p) => p.lot.bundleSetId?.trim())
        .find(Boolean) ||
      `legacy-${picks
        .map((p) => p.lot.id)
        .sort()
        .join("-")}`;

    const built = buildBundleDisplayRow(setId, bundle, picks);
    if (built) return built;
  }

  return null;
}

function bundleRowFromSet(
  bundleSetId: string,
  group: ReadyStockLotRow[],
  bundle: BundleCatalogRow,
  remaining: Map<string, number>,
): Extract<ReadyStockDisplayRow, { kind: "bundle" }> | null {
  const components = bundle.bundleComponents ?? [];
  if (components.length < 2) return null;

  let maxSets = Infinity;
  const picks: Array<{
    lot: ReadyStockLotRow;
    comp: { code: string; name: string; bottlesPerUnit: number };
    bottlesUsed: number;
  }> = [];

  for (const comp of components) {
    const lot = group.find((l) => l.productCode.trim().toLowerCase() === comp.code.trim().toLowerCase());
    if (!lot) return null;

    const avail = remaining.get(lot.id) ?? 0;
    if (avail <= 0 || comp.bottlesPerUnit <= 0) return null;

    const setsForComp = Math.floor(avail / comp.bottlesPerUnit);
    maxSets = Math.min(maxSets, setsForComp);
    picks.push({ lot, comp, bottlesUsed: 0 });
  }

  if (!Number.isFinite(maxSets) || maxSets <= 0) return null;

  for (const pick of picks) {
    pick.bottlesUsed = maxSets * pick.comp.bottlesPerUnit;
  }

  return buildBundleDisplayRow(bundleSetId, bundle, picks);
}

/** Group batch lots for the ready-stock table — one row per bundle set, no heuristic pairing. */
export function groupReadyStockLotsForDisplay(
  lots: ReadyStockLotRow[],
  catalog: BundleCatalogRow[],
): ReadyStockDisplayRow[] {
  const bundles = catalog.filter(isMultiProductBundle);
  const remaining = new Map<string, number>();
  for (const lot of lots) {
    if (lot.bottles > 0) remaining.set(lot.id, lot.bottles);
  }

  const rows: ReadyStockDisplayRow[] = [];

  const bySetId = new Map<string, ReadyStockLotRow[]>();
  for (const lot of lots) {
    const setId = lot.bundleSetId?.trim();
    if (!setId || (remaining.get(lot.id) ?? 0) <= 0) continue;
    const list = bySetId.get(setId) ?? [];
    list.push(lot);
    bySetId.set(setId, list);
  }

  for (const [setId, group] of bySetId) {
    const bundleCode = group[0]?.bundleCode?.trim().toLowerCase();
    let bundle = bundleCode
      ? bundles.find((b) => b.code.trim().toLowerCase() === bundleCode)
      : undefined;
    if (!bundle) {
      bundle = bundles.find((b) => (group[0]?.note ?? "").includes(bundleNoteKey(b.name)));
    }
    if (!bundle) continue;

    const built = bundleRowFromSet(setId, group, bundle, remaining);
    if (!built) continue;
    rows.push(built);
    consumeBundleRow(built, remaining);
  }

  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const bundle of bundles) {
      const candidate = pickBundleByNote(
        bundle,
        lots.filter((l) => (remaining.get(l.id) ?? 0) > 0),
        remaining,
      );
      if (!candidate) continue;
      rows.push(candidate);
      consumeBundleRow(candidate, remaining);
      progressed = true;
      break;
    }
  }

  for (const lot of lots) {
    const bottlesOnHand = remaining.get(lot.id) ?? 0;
    if (bottlesOnHand <= 0) continue;
    rows.push({ kind: "single", lot, bottlesOnHand });
  }

  return rows.sort((a, b) => {
    const nameA = a.kind === "bundle" ? a.bundleName : a.lot.productName;
    const nameB = b.kind === "bundle" ? b.bundleName : b.lot.productName;
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  });
}
