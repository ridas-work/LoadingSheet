---
wave: 2
depends_on: ["26-ready-bottle-stock-ledger/01-PLAN.md"]
gap_closure: false
files_modified:
  - "app/api/batch-filling/route.ts"
  - "lib/readyBottleFillingSync.ts"
  - "components/BatchFillingGrid.tsx"
  - "components/ReadyBottleStockPanel.tsx"
  - "app/(app)/dispatch/filling/page.tsx"
  - "README.md"
autonomous: true
---

<phase_goal>
**Rashid** sees and maintains **ready bottle on-hand** on `/dispatch/filling`: opening balance for legacy stock, live totals per product, and automatic ledger increments when he saves **ready to deliver** bottle counts.
</phase_goal>

<must_haves>
- [ ] New **`ReadyBottleStockPanel`** above the batch grid: table of catalog products with **On hand (bottles)**, link to movements, **Set opening balance** inline (first-time prominent).
- [ ] Help text: ready pool = bottles finished (capped, labeled, packed) on the production floor; opening balance = stock that existed before software; daily ready entries **add** to this pool.
- [ ] On `PATCH /api/batch-filling` save: compare previous `readyToDeliverBottles` per packing line vs new; apply **delta only** to ready ledger (`reason: filling_ready`, note includes batch + date). Store `readyLedgerApplied` snapshot on entry (mirror `packagingUipApplied` pattern).
- [ ] Idempotent re-save: changing 20→25 ready adds +5; 25→20 subtracts 5 (if on-hand allows).
- [ ] Admin filling view: panel read-only; no opening balance edit.
- [ ] README: document legacy opening stock + ready pool workflow.
</must_haves>

<tasks>
  <task id="1" name="filling-sync">
    <step>Create `lib/readyBottleFillingSync.ts` with `syncReadyBottleLedgerFromFillingEntry(prev, next, audit)`.</step>
    <step>Extend `BatchFillingDailyEntry` schema: `readyLedgerApplied: [{ productCode, readyBottlesApplied }]`.</step>
    <step>Hook in batch-filling PATCH after packaging UIP sync; block save if delta would make on-hand negative (show product names).</step>
  </task>

  <task id="2" name="stock-panel-ui">
    <step>`ReadyBottleStockPanel` fetches `GET /api/ready-bottle-stock`; sort by name; highlight zero on-hand in amber.</step>
    <step>Opening balance: modal or inline edit → PATCH with reason `opening_balance` + required note "Legacy stock before go-live".</step>
    <step>Manual adjust button for Rashid corrections (reason `manual_adjust`).</step>
  </task>

  <task id="3" name="filling-page-integration">
    <step>Mount panel on `/dispatch/filling` above `BatchFillingGrid`.</step>
    <step>After successful row save, refresh stock panel counts (client refetch or return updated stock in API response).</step>
    <step>Clarify copy on **Ready to deliver (bottles)** column: "Adds to ready stock pool when saved."</step>
  </task>
</tasks>

<verification>
- Rashid sets opening balance Rhino 750ml = 200; panel shows 200.
- Rashid saves batch line ready +30 Rhino 750ml; panel shows 230; movement `filling_ready` +30.
- Re-save same line ready 30→30: no duplicate movement.
- Admin sees panel read-only.
</verification>
