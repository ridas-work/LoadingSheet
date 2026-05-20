# Phase 22 — Hybrid PO (standard + custom cartons) — research

## RESEARCH COMPLETE

### Problem statement (operations)

Real orders (e.g. **AMIR STORE**) mix:

1. **Standard dispatch** — each product ships in its **own cartons** at catalog **bottles per carton** (Rhino 250ml × 40 cartons, Degrease × 20 cartons, …).
2. **Custom physical cartons** — the warehouse **packs several different SKUs into one box** (e.g. Power Wash Pouch + Brighten bottle + Brighten pouch + Fabrito bottle in **one** carton, possibly × multiple identical such cartons).

Today the app forces a **binary choice** on create: `orderKind === "standard"` **or** `orderKind === "mixed_sample"`. Mixed mode replaces the whole PO with only mixed-sample box rows (`lib/orderPayload.ts` + `buildMixedSampleSheetLines`). There is **no** first-class way to express “mostly standard lines + a few custom combo cartons” in **one** `Order`.

### Relevant code paths

| Area | Files / behavior |
|------|-------------------|
| Sheet line shape | `lib/models/Order.ts` — `lineKind` `"standard"` \| `"mixed_sample"`, `mixedContents`, `componentBatches` |
| Standard expansion | `lib/buildSheetLines.ts` — one row per carton |
| Mixed expansion | `lib/mixedSampleBox.ts` — `buildMixedSampleSheetLines`, label, `componentBatches` per inner product |
| Parse + branch | `lib/orderPayload.ts` — mutually exclusive `orderKind` branches |
| PO UI | `app/(app)/new-order/page.tsx` — radio standard / mixed |
| Admin edit | `components/AdminOrderEditForm.tsx` — same toggle |
| Batch / weight | `components/LoadingSheetBatchEditor.tsx`, `lib/batchVolume.ts`, `lib/bundleCatalog.ts` — already keyed off `lineKind` per row |

**Conclusion:** The **storage model** (`sheetLines` with optional `mixed_sample` rows) already supports **heterogeneous** lines in one order **if** we generate them together. The **gap** is **authoring** and **payload**: parser and UI must allow **both** standard `items[]` and **one or more** custom carton definitions in one submit.

### Design direction (recommended v1)

1. **Unify order kind** for new POs:
   - Prefer **`orderKind: "standard"`** (or new `"hybrid"`) with **`customCartons`** (array) alongside **`items`**, rather than keeping mutually exclusive radio.
   - **Backward compatibility:** existing `mixed_sample` orders unchanged; migration optional (read-only legacy).

2. **`customCartons` shape** (conceptual):

   ```ts
   customCartons: Array<{
     boxCount: number;           // identical physical cartons
     contents: Array<{ productName: string; bottles: number }>;
     label?: string;            // optional override for printed row title
   }>
   ```

   Each entry expands to **`boxCount`** sheet lines with `lineKind: "mixed_sample"` and the same `mixedContents` / `componentBatches` pattern as today (reuse `buildMixedSampleSheetLines` **per** custom carton definition, then **concatenate**).

3. **`boxNo` assignment:** After `buildSheetLines(items)`, append custom-carton lines and **renumber** `boxNo` globally (1…N). Document rule in plan (order: all standard lines in `items` order, then custom cartons in array order — **or** allow drag reorder in v2).

4. **UI (“Create box”)**  
   - Primary CTA: **Add custom carton** (or **Create box**).  
   - Opens inline card: “Products in this carton” (repeatable rows: product picker + bottles), “How many identical cartons”.  
   - Allow **multiple** custom carton groups.  
   - Standard grid remains for normal SKU × cartons.

5. **Validation**  
   - Product names in custom cartons must resolve to catalog (or same rules as mixed sample today).  
   - No double-counting: quantities in **standard `items`** vs **custom cartons** are **independent** (user responsibility) — optional v2 warning if same SKU appears in both (plan as follow-up).

6. **Risks**  
   - **Admin edit** must rebuild or edit `sheetLines` consistently when hybrid payload changes.  
   - **Batch assignment** already supports mixed lines; verify combo bundles + hybrid.  
   - **Reporting / admin summary** — ensure `orderKind` / mixed detection still makes sense (`adminOrderSummary.ts`).

### Out of scope for v1 (note in plans)

- Drag-and-drop **box sequence** on loading sheet.  
- Splitting one standard product line **across** standard and custom (advanced allocation).

### Success criteria (phase goal)

One PO can be entered with **many standard carton products** and **≥ 0 custom multi-product cartons**, saved as one `Order`, printable loading sheet with correct rows, batch entry works per row.
