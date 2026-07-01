import productBomData from "@/data/product-packaging-bom.json";
import thresholdsData from "@/data/packaging-reorder-thresholds.json";
import type { PackagingItemDoc } from "@/lib/models/PackagingItem";
import { packagingBalance } from "@/lib/packagingInventory";
import type {
  PackagingReorderAlert,
  PackagingReorderReport,
  PackagingReorderRule,
  PackagingReorderSeverity,
} from "@/lib/packagingReorderAlerts.types";

type BomLine = {
  packagingItemCode: string;
  qtyPerBottle?: number;
  qtyPerCarton?: number;
};

type BomEntry = {
  productCode: string;
  lines?: BomLine[];
  includes?: Array<{ productCode: string; bottlesPerUnit?: number }>;
};

const BOM = productBomData as BomEntry[];
const RULES = (thresholdsData as { rules: PackagingReorderRule[] }).rules;

function normCode(code: string): string {
  return code.trim().toLowerCase();
}

export function loadProductBom(): BomEntry[] {
  return BOM;
}

export function loadReorderRules(): PackagingReorderRule[] {
  return RULES;
}

export function thresholdsForProduct(productCode: string): number | null {
  const code = normCode(productCode);
  const rule = RULES.find(
    (r) => r.kind === "product_any_component" && normCode(r.productCode ?? "") === code,
  );
  return rule?.threshold ?? null;
}

export function expandBomPackagingCodes(productCode: string): string[] {
  const code = normCode(productCode);
  const entry = BOM.find((b) => normCode(b.productCode) === code);
  if (!entry) return [];

  const codes = new Set<string>();
  for (const line of entry.lines ?? []) {
    codes.add(normCode(line.packagingItemCode));
  }
  for (const inc of entry.includes ?? []) {
    for (const nested of expandBomPackagingCodes(inc.productCode)) {
      codes.add(nested);
    }
  }
  return [...codes];
}

function balanceForItem(
  item: PackagingItemDoc | Record<string, unknown> | undefined,
): number {
  if (!item) return 0;
  const doc = item as PackagingItemDoc;
  return packagingBalance({
    purchasedQty: doc.purchasedQty,
    rejectedDamage: doc.rejectedDamage,
    uip: doc.uip,
    onHand: doc.onHand,
  });
}

function severityFor(balance: number, missing: boolean): PackagingReorderSeverity {
  if (missing || balance <= 0) return "critical";
  return "warning";
}

function alertKey(ruleId: string, packagingItemCode: string): string {
  return `${ruleId}:${packagingItemCode}`;
}

export function buildPackagingReorderAlerts(
  items: Array<PackagingItemDoc | Record<string, unknown>>,
): PackagingReorderReport {
  const byCode = new Map<string, PackagingItemDoc | Record<string, unknown>>();
  const nameByCode = new Map<string, string>();
  for (const item of items) {
    const code = normCode(String((item as PackagingItemDoc).code ?? ""));
    if (!code) continue;
    byCode.set(code, item);
    const name = String((item as PackagingItemDoc).name ?? code);
    nameByCode.set(code, name);
  }

  const alerts: PackagingReorderAlert[] = [];
  const seen = new Set<string>();

  function pushAlert(
    rule: PackagingReorderRule,
    packagingItemCode: string,
    affectedProducts?: string[],
  ) {
    const code = normCode(packagingItemCode);
    const key = alertKey(rule.id, code);
    if (seen.has(key)) return;
    seen.add(key);

    const item = byCode.get(code);
    const missing = !item;
    const balance = balanceForItem(item);
    if (balance > rule.threshold) return;

    alerts.push({
      ruleId: rule.id,
      label: rule.label,
      packagingItemCode: code,
      itemName: nameByCode.get(code) ?? code,
      balance,
      threshold: rule.threshold,
      severity: severityFor(balance, missing),
      affectedProducts,
      missingFromInventory: missing || undefined,
    });
  }

  for (const rule of RULES) {
    if (rule.kind === "product_any_component" && rule.productCode) {
      const codes = expandBomPackagingCodes(rule.productCode);
      for (const code of codes) {
        pushAlert(rule, code, [rule.label]);
      }
    } else if (
      (rule.kind === "item_threshold" || rule.kind === "shared_pool") &&
      rule.packagingItemCode
    ) {
      pushAlert(rule, rule.packagingItemCode);
    }
  }

  alerts.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === "critical" ? -1 : 1;
    }
    return a.balance - b.balance;
  });

  const critical = alerts.filter((a) => a.severity === "critical").length;
  const warning = alerts.length - critical;

  return {
    checkedAt: new Date().toISOString(),
    summary: { warning, critical, total: alerts.length },
    alerts,
  };
}

/*
 * Fixture: rhino-lids balance 400, brighten-fabrito-lids balance 1200
 * → Rhino 250 ml alert (threshold 500), Brighten 1 L alert (1000), shared lids alert (1500)
 */
