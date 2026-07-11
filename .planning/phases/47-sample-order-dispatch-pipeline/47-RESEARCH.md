# Phase 47 — Sample order dispatch pipeline — research

## RESEARCH COMPLETE

### Stakeholder goal

After **Nouman / Javeria / Aslam / Ahtisham** request an **outgoing** sample on a field visit and **Waleed approves**, the sample should enter a **separate dispatch pipeline** — not mixed with regular customer POs:

1. **Rashid portal** — new route `/dispatch/sample-orders` (not `/dispatch/po-orders` or `/orders`)
2. Rashid assigns batches from **Esha sample production** only (`productionPurpose: sample`)
3. **On batch assignment save** → deduct liters from Esha sample pool (not on rep request)
4. **Ali** — new route `/dispatch/sample-trips` to build vehicle trips from **sample orders only** (not regular PO trips)

Field visit approval flow stays; delivery recording on visit remains for CRM/follow-up.

### Current codebase

| Area | Today |
|------|--------|
| Field visit sample | `request_sample_approval` → Waleed `approve` at `/admin/field-visit-samples` |
| Stock deduct | On `request_sample_approval` when `outgoing` (`deductSampleProduction`) — **must move to Rashid assign** |
| Esha batches | `ProductionBatch.productionPurpose: "regular" \| "sample"` |
| Rashid PO queue | `/dispatch/po-orders`, `/dispatch/trips`, batch assign on loading sheet |
| Rashid batch pool | `regularProductionBatchMongoFilter()` — excludes sample batches |
| Trips | `DispatchTrip.orderIds[]` → `Order` docs; Ali-only create |
| Order kinds | `standard`, `mixed_sample`, `hybrid` — no `field_sample` |
| Field visit link | `FieldVisitTicket.linkedOrderId` exists (was PO link; now unused) |

### Recommended design

#### 1. Sample order entity

Extend **`Order`** with:

- `orderKind: "field_sample"` (new enum value)
- `fieldVisitTicketId` (ObjectId ref)
- `sampleReference` — display label e.g. `SAMPLE-{visitId short}` instead of PO number
- `items` / `sheetLines` built from `ticket.sampleProducts` on approve (bottles per line)

Reuse existing batch-assignment APIs where possible with `orderKind` guard.

#### 2. Waleed approve hook

On **approve** + `sampleMode === "outgoing"`:

1. Create `Order` (`field_sample`) with customer/place from visit
2. Set `ticket.linkedOrderId` + status flag `sampleDispatchStatus: "awaiting_batches"`
3. **Remove** `deductSampleProduction` from `request_sample_approval`
4. On **reject** before assignment: no stock movement (already true if deduct moved)

#### 3. Rashid sample orders route

- **`/dispatch/sample-orders`** — list `orderKind: field_sample` where batches incomplete / not on trip
- **`/dispatch/sample-orders/[id]/loading-sheet`** — batch editor using **`sampleProductionBatchMongoFilter()`** only
- **PATCH batch-assignments** — on successful save, call `deductSampleProduction` once (idempotent via `sampleStockDeductedAt` on order)
- Show available sample pool liters per product (from `samplePoolForCatalog`)

#### 4. Sample trips (Ali)

- **`DispatchTrip.tripKind: "regular" \| "sample"`** (default `regular`)
- **`/dispatch/sample-trips`** — list/create/edit sample trips only
- Trip picker shows only `field_sample` orders with batches complete, not on another trip
- **Block** mixing sample + regular orders on same trip (API validation)
- Rashid batch sheet link from sample trip detail (mirror Phase 45 trip loading sheet)

#### 5. Stock deduction timing (change from Phase 42/46 conversation)

| Event | Stock |
|-------|--------|
| Rep requests sample | No deduct |
| Waleed approves | No deduct — creates sample order |
| Rashid saves batch assignment | **Deduct** from sample production pool |
| Waleed rejects (before assign) | No movement |

#### 6. Roles & nav

- Rashid: nav link **Sample orders** → `/dispatch/sample-orders`
- Ali: nav link **Sample trips** → `/dispatch/sample-trips`
- Regular **Trips** / **PO orders** exclude `field_sample`
- Admin: can view both

#### 7. Out of scope (v1)

- Incoming samples (“customer gave sample”) — no dispatch order
- Zaman gate for sample trips — optional follow-up if samples leave factory on vehicle
- Auto-sync sample delivery on field visit with gate close

### Risks

- Migrate existing visits that already deducted on request — one-time script or grandfather
- `poNumber` required on Order — use synthetic `SAMPLE-…` prefix
- Batch assignment UI duplication — extract shared editor with `batchPool: "regular" \| "sample"` prop

### Key files

- `lib/models/Order.ts`, `lib/models/DispatchTrip.ts`, `lib/models/FieldVisitTicket.ts`
- `app/api/admin/field-visit-samples/[id]/route.ts`
- `app/api/field-visits/[id]/route.ts` — remove early deduct
- `lib/sampleProductionStock.ts`, `lib/sampleOrderFromVisit.ts` (new)
- `app/(app)/dispatch/sample-orders/`, `app/(app)/dispatch/sample-trips/`
- `components/TripBatchAssignmentSheet.tsx` — sample batch pool mode
