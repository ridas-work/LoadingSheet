---
wave: 1
depends_on: ["17-rashid-daily-filling-waste/03-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/roles.ts"
  - "lib/orderPayload.ts"
  - "lib/preserveSheetBatches.ts"
  - "app/api/orders/[id]/route.ts"
  - "app/api/orders/route.ts"
autonomous: true
---

<phase_goal>
**Admin-only** `PATCH /api/orders/[id]` to update PO header, products, and quantities; rebuild loading-sheet rows while preserving batch picks where rows still match.
</phase_goal>

<must_haves>
- [ ] `canEditOrders(role)` → true only for `admin`.
- [ ] Shared order validation/parsing in `lib/orderPayload.ts` (used by POST create + PATCH update).
- [ ] `PATCH /api/orders/[id]` — admin only; updates poNumber, customerName, city, deadline, items, mixedSample, sheetLines.
- [ ] `preserveSheetBatches(oldLines, newLines)` copies batchNo / componentBatches when box+product+kind match.
- [ ] Sets `adminEditedAt`, `adminEditedByName` on save.
- [ ] Non-admin PATCH → 403.
</must_haves>

<tasks>
  <task id="1" name="roles-and-payload">
    <step>Add `canEditOrders` to `lib/roles.ts`.</step>
    <step>Extract parse/validate + build sheet lines from `app/api/orders/route.ts` into `lib/orderPayload.ts`.</step>
    <step>Refactor POST to use shared helper (no behavior change).</step>
  </task>

  <task id="2" name="patch-order-api">
    <step>Add optional audit fields on Order schema if missing: `adminEditedAt`, `adminEditedByName`.</step>
    <step>Implement `PATCH` in `app/api/orders/[id]/route.ts` with admin guard.</step>
    <step>After rebuild, run `preserveSheetBatches`; save order.</step>
  </task>
</tasks>

<verification>
- Admin PATCH changes carton count → sheet line count updates; batch kept on unchanged product rows.
- `po_creator` PATCH → 403.
- `npm run build` passes.
</verification>
