import catalog from "@/data/rashid-plan-product-tasks.json";

export type RashidPlanTask = {
  taskCode: string;
  label: string;
  packagingItemCode?: string;
};

export type RashidPlanProduct = {
  productCode: string;
  displayName: string;
  tasks: RashidPlanTask[];
};

const PRODUCTS = catalog as RashidPlanProduct[];

export function loadRashidPlanProducts(): RashidPlanProduct[] {
  return [...PRODUCTS].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function productByCode(productCode: string): RashidPlanProduct | null {
  const key = productCode.trim().toLowerCase();
  return PRODUCTS.find((p) => p.productCode.toLowerCase() === key) ?? null;
}

export function taskInProduct(
  productCode: string,
  taskCode: string,
): RashidPlanTask | null {
  const product = productByCode(productCode);
  if (!product) return null;
  const key = taskCode.trim().toLowerCase();
  return product.tasks.find((t) => t.taskCode.toLowerCase() === key) ?? null;
}

export function formatProductDuty(displayName: string, taskLabel: string): string {
  return `${displayName} — ${taskLabel}`;
}

export function productTaskLineKey(
  employeeId: string,
  productCode: string,
  taskCode: string,
): string {
  return `${employeeId.trim().toLowerCase()}::${productCode.trim().toLowerCase()}::${taskCode.trim().toLowerCase()}`;
}

export function dutyLabelForProductTask(productCode: string, taskCode: string): string | null {
  const product = productByCode(productCode);
  const task = taskInProduct(productCode, taskCode);
  if (!product || !task) return null;
  return formatProductDuty(product.displayName, task.label);
}

export function validateProductTask(productCode: string, taskCode: string): string | null {
  if (!productByCode(productCode)) return `Unknown product: ${productCode}`;
  if (!taskInProduct(productCode, taskCode)) {
    return `Unknown task ${taskCode} for product ${productCode}`;
  }
  return null;
}
