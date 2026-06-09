# Phase 15 — Research: Mixed sample box (one physical carton, many products)

## Problem (user)

Sample orders often ship **small bottle counts** across several products — e.g. Product A × 5 bottles, Product B × 2 bottles — in **one physical box**, not as separate cartons (1 carton × 5 bottles + 1 carton × 2 bottles).

Today the app uses **Rule B**: each PO line has `boxes` (cartons) and `bottlesPerBox`. `buildSheetLines()` emits **one loading-sheet row per carton**, one product per row. The Phase 14 **Sample / custom** toggle only changes bottles-per-carton on a **single-SKU** row; it does not combine multiple SKUs into one box.

## Current behaviour

| Layer | Behaviour |
|-------|-----------|
| `Order.items[]` | `{ productName, boxes, bottlesPerBox }` per SKU |
| `buildSheetLines` | `boxes` iterations → one `sheetLines` row each |
| Loading sheet | Columns: Box No, Product Name, NO OF BOTTLES, Batch, Weight |
| Bundles | One row per bundle unit; `componentBatches[]` for multi-batch assignment |
| Admin summary | Sums `items[].boxes` per catalog column (cartons) |

## Proposed solution: **Mixed sample box** order mode

### UX (PO team on `/new-order`)

1. Toggle: **“Mixed sample box order”** (mutually exclusive with normal full-carton grid for that save — or allow only mixed mode when enabled).
2. PO enters **bottle count per product** (not cartons) for every SKU they want in the assortment.
3. **Number of identical mixed boxes** to ship (default **1**) — e.g. 2 means two physical boxes with the **same** product mix inside each.
4. Validation: at least one product with bottles ≥ 1; at least one mixed box count ≥ 1.

### Data model

Add to `Order` (keep existing `items` for standard orders):

```ts
orderKind: "standard" | "mixed_sample"  // default "standard"

mixedSample?: {
  boxCount: number;  // physical cartons to print (≥ 1)
  contents: Array<{ productName: string; bottles: number }>;  // per box recipe
}
```

**Standard orders:** unchanged — `items[]` + `buildSheetLines` as today.

**Mixed sample orders:** `items[]` can be empty or derived mirror for reporting; source of truth is `mixedSample`. On create:

- For each physical box `1..boxCount`, one `sheetLines` row:
  - `lineKind: "mixed_sample"`
  - `productName`: display label e.g. `Mixed sample box` (or auto: `Sample: Rhino×5, Fabrito×2`)
  - `bottlesPerBox`: **total bottles in that box** (sum of contents) — useful for dispatch totals
  - `mixedContents`: `[{ productName, bottles }, ...]` — same recipe every box
  - `componentBatches`: initialized empty; filled at dispatch like bundles

### Loading sheet & batches

- **Print:** One row per physical mixed box. Product column shows short label + optional sub-lines on screen (print: compact text or footnote list).
- **Batch assignment:** Reuse **bundle-style** `componentBatches` — one batch dropdown per product inside the mix (Rhino batch, Fabrito batch, etc.).
- **Liters / weight:** Sum `bottles × litersPerBottle` per component; validate against each batch pool (same as bundle lines).

### Admin summary (Waleed)

- For `mixed_sample` orders: count **bottles** from `mixedSample.contents × boxCount` into product columns (not cartons), OR show a single “Mixed sample” column — **decision in plan:** prefer attributing bottles to existing product columns so totals stay meaningful.

### Out of scope (v1)

- Different recipes per box (Box 1 ≠ Box 2) — only **identical** mixed boxes in v1.
- Mixing standard full cartons + mixed sample on **same** PO — v1: one kind per order to avoid confusion.

## Technical reuse

| Existing | Reuse for mixed sample |
|----------|-------------------------|
| `componentBatches` on `sheetLines` | Per-product batch picks inside one box |
| `bundleCatalog.ts` validation | Extend or add `mixedSampleCatalog.ts` for liter allocation |
| `LoadingSheetBatchEditor` | Detect `lineKind === "mixed_sample"` → multi dropdown UI (like bundles) |

## Risks

- **Admin grid** assumes carton = `items.boxes`; needs explicit mixed-sample path.
- **Legacy orders** — no migration; `orderKind` defaults to `standard`.
- **Product name matching** — contents use catalog display names (same as today).

## Open questions (resolved for planning)

| Question | Decision |
|----------|----------|
| One box or many identical boxes? | `boxCount` field, default 1 |
| Bottles vs cartons on entry? | Bottles per product in mixed mode |
| Same PO as normal cartons? | v1: **no** — mixed sample is whole-order mode |
