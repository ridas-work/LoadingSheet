export type ReportScope = "all" | "delivered" | "pipeline";

export type ReportOptions = {
  scope?: ReportScope;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export type ProductTotalRow = {
  productCode: string;
  productName: string;
  summaryLabel: string;
  cartons: number;
  bottles: number;
  orderCount: number;
  isUnmapped?: boolean;
};

export type GrandTotals = {
  orderCount: number;
  customerCount: number;
  totalCartons: number;
  totalBottles: number;
};

export type CustomerOrderRow = {
  orderId: string;
  poNumber: string;
  customerName: string;
  createdAt: string;
  gateDeliveryStatus: string;
  productsSummary: string;
  totalBottles: number;
  totalCartons: number;
};

export type CustomerProductSummaryRow = {
  productCode: string;
  productName: string;
  summaryLabel: string;
  cartons: number;
  bottles: number;
  orderCount: number;
  isUnmapped?: boolean;
};

export type DispersionRow = {
  customerName: string;
  cartons: number;
  bottles: number;
  orderCount: number;
};

export type BatchBottleLineRow = {
  batchId: string;
  batchNo: string;
  poolProductName: string;
  productCode: string;
  productName: string;
  filledBottles: number;
  orderBottles: number;
  totalBottles: number;
};

export type BatchDestinationRow = {
  batchNo: string;
  productCode: string;
  productName: string;
  orderId: string;
  poNumber: string;
  customerName: string;
  gateDeliveryStatus: string;
  createdAt: string;
  deliveredAt: string;
  vehicleNo: string;
  dcNo: string;
  boxNo: number;
  bottles: number;
  liters: number;
};

export type BatchBottlesReport = {
  batchQuery: string;
  batchNumbers: string[];
  rows: BatchBottleLineRow[];
  destinationRows: BatchDestinationRow[];
  totals: {
    filledBottles: number;
    orderBottles: number;
    totalBottles: number;
    destinationBottles: number;
    destinationLiters: number;
    destinationOrders: number;
    destinationCustomers: number;
  };
  grandTotals: GrandTotals;
};

export type ProductTotalsReport = {
  products: ProductTotalRow[];
  unmapped: string[];
  grandTotals: GrandTotals;
  customerNames?: string[];
};

export type CustomerOrdersReport = {
  customerQuery: string;
  orders: CustomerOrderRow[];
  productTotals: CustomerProductSummaryRow[];
  customerNames: string[];
  grandTotals: GrandTotals;
  productCode?: string;
};

export type DispersionReport = {
  productCode: string;
  productName: string;
  rows: DispersionRow[];
  totals: { cartons: number; bottles: number };
  grandTotals: GrandTotals;
};

export type OverviewReport = {
  grandTotals: GrandTotals;
  topProducts: ProductTotalRow[];
  customerNames: string[];
};
