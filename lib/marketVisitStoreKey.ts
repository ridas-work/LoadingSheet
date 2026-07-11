/** Stable key for matching the same retail store across market visit tickets. */
export function normalizeMarketStoreKey(storeName: string, location: string): string {
  const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
  return `${norm(storeName)}::${norm(location)}`;
}
