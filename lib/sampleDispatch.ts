/**
 * Field-visit sample dispatch pipeline helpers.
 *
 * Sample orders reuse the `Order` collection with `orderKind: "field_sample"`,
 * and sample trips reuse `DispatchTrip` with `tripKind: "sample"`. These filters
 * keep the sample pipeline visually and logically separate from regular customer POs.
 */

export const FIELD_SAMPLE_ORDER_KIND = "field_sample" as const;
export const SAMPLE_TRIP_KIND = "sample" as const;

export function isFieldSampleOrder(orderKind?: string | null): boolean {
  return orderKind === FIELD_SAMPLE_ORDER_KIND;
}

export function isSampleTrip(tripKind?: string | null): boolean {
  return tripKind === SAMPLE_TRIP_KIND;
}

/** Regular customer PO lists — exclude field sample orders (missing kind = regular). */
export function regularOrdersMongoFilter(): Record<string, unknown> {
  return { orderKind: { $ne: FIELD_SAMPLE_ORDER_KIND } };
}

/** Sample order lists — only field sample orders. */
export function sampleOrdersMongoFilter(): Record<string, unknown> {
  return { orderKind: FIELD_SAMPLE_ORDER_KIND };
}

/** Regular trip lists — exclude sample trips (missing kind = regular). */
export function regularTripsMongoFilter(): Record<string, unknown> {
  return { tripKind: { $ne: SAMPLE_TRIP_KIND } };
}

/** Sample trip lists — only sample trips. */
export function sampleTripsMongoFilter(): Record<string, unknown> {
  return { tripKind: SAMPLE_TRIP_KIND };
}

/** Sample orders Ali can add to a sample trip — batches assigned, still at factory. */
export function readySampleOrdersMongoFilter(): Record<string, unknown> {
  return {
    orderKind: FIELD_SAMPLE_ORDER_KIND,
    discardedAt: null,
    sampleStockDeductedAt: { $ne: null },
    gateDeliveryStatus: { $nin: ["out_for_delivery", "delivered"] },
  };
}

/** Sample orders Rashid still needs to assign batches on — not yet fully assigned/deducted. */
export function pendingSampleOrdersMongoFilter(): Record<string, unknown> {
  return {
    orderKind: FIELD_SAMPLE_ORDER_KIND,
    discardedAt: null,
    sampleStockDeductedAt: null,
  };
}
