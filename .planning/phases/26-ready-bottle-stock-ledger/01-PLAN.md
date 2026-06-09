---
wave: 1
depends_on: ["23-rashid-bottle-filling-readiness/02-PLAN.md", "21-gate-guard-zaman/03-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/models/ReadyBottleStock.ts"
  - "lib/models/ReadyBottleMovement.ts"
  - "lib/readyBottleLedger.ts"
  - "lib/bottlesFromSheetLines.ts"
  - "app/api/ready-bottle-stock/route.ts"
  - "app/api/ready-bottle-stock/[code]/route.ts"
  - "app/api/ready-bottle-stock/movements/route.ts"
autonomous: true
---

<phase_goal>
Introduce a **product-level ready bottle ledger**: opening balance, on-hand totals, audited movements, and helpers to compute bottles per product from loading-sheet rows.
</phase_goal>

<must_haves>
- [ ] `ReadyBottleStock` model: `productCode`, `productName` snapshot, `onHandBottles` ≥ 0, timestamps.
- [ ] `ReadyBottleMovement` model: `productCode`, `delta`, `reason` enum, `onHandAfter`, `note`, user, optional `orderId` / `poNumber` / `batchNo` / `entryDate`.
- [ ] `lib/readyBottleLedger.ts`: `applyMovement`, `setOpeningBalance`, `getStockMap`, idempotent guards.
- [ ] `lib/bottlesFromSheetLines.ts`: aggregate bottle count per catalog `productCode` from `sheetLines` (standard rows + mixed/custom via product name → packing lookup).
- [ ] `GET /api/ready-bottle-stock` — list all active catalog products with on-hand (0 if never set).
- [ ] `PATCH /api/ready-bottle-stock/[code]` — Rashid (`dispatch_editor`) sets **opening balance** or **manual_adjust** with note; admin read-only.
- [ ] `GET /api/ready-bottle-stock/movements` — paginated audit (Rashid + admin).
</must_haves>

<tasks>
  <task id="1" name="models">
    <step>Create Mongoose schemas with indexes on `productCode` and movement `createdAt`.</step>
    <step>Export types for API and UI.</step>
  </task>

  <task id="2" name="ledger-engine">
    <step>Implement `applyReadyBottleDelta({ productCode, delta, reason, ... })` — reject if on-hand would go negative unless `allowNegative: false` (default block).</step>
    <step>`setOpeningBalance(code, bottles)` writes movement `opening_balance` and sets absolute on-hand (only if never set, OR allow Rashid overwrite with confirm note in API).</step>
    <step>Helper `readyAppliedKey(orderId, reason)` on Order optional fields stub for wave 3.</step>
  </task>

  <task id="3" name="sheet-bottle-aggregation">
    <step>Map each sheet row to bottles per product: standard = `bottlesPerBox` per row; mixed/custom = sum `mixedContents[].bottles` by resolved product name.</step>
    <step>Unit-test or script-verify against sample hybrid PO sheet.</step>
  </task>

  <task id="4" name="api-routes">
    <step>Auth: `dispatch_editor` write, `admin` read, others 403.</step>
    <step>Validate `productCode` against active `ProductPacking`.</step>
    <step>Return `{ products: [{ code, name, onHandBottles, openingBalanceSetAt }] }`.</step>
  </task>
</tasks>

<verification>
- `npm run build` passes.
- PATCH opening balance 500 Rhino 500ml → GET shows 500 on-hand + movement row.
- Second PATCH manual_adjust −50 → 450 on-hand with audit.
- Negative adjust below zero returns 400 with clear error.
</verification>
