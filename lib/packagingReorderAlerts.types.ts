export type PackagingReorderRuleKind =
  | "product_any_component"
  | "item_threshold"
  | "shared_pool";

export type PackagingReorderRule = {
  id: string;
  kind: PackagingReorderRuleKind;
  label: string;
  threshold: number;
  productCode?: string;
  packagingItemCode?: string;
};

export type PackagingReorderSeverity = "warning" | "critical";

export type PackagingReorderAlert = {
  ruleId: string;
  label: string;
  packagingItemCode: string;
  itemName: string;
  balance: number;
  threshold: number;
  severity: PackagingReorderSeverity;
  affectedProducts?: string[];
  missingFromInventory?: boolean;
};

export type PackagingReorderReport = {
  checkedAt: string;
  summary: {
    warning: number;
    critical: number;
    total: number;
  };
  alerts: PackagingReorderAlert[];
};
