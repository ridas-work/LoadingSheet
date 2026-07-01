# Phase 42 Research — Esha sample vs regular production

## RESEARCH COMPLETE

### User request (stakeholder)

**Esha portal** (`batch_editor`, user `esha`) should have **two categories**:

1. **Sample production** — Esha registers batches the same way as today, but marks them **sample production**.
2. **Regular production** — unchanged; feeds Rashid’s normal batch pool for PO loading sheets.

When **Nouman, Javeria, Aslam, or Ahtisham** request samples on a **field visit** and record **outgoing sample delivery** (after Waleed approval), the system **deducts** from the **sample production pool** — not from regular dispatch batches.

### What exists today

| Area | Current behavior |
|------|------------------|
| `ProductionBatch` | `batchKind: standard \| custom_box`; no sample/regular split |
| Esha UI | `/production/batches` — single list + form |
| Rashid batch assign | Picks from all approved `ProductionBatch` rows (minus locked/empty) |
| Field visits | `request_sample_approval` → Waleed approves → `record_sample_event` (delivery); `sampleProducts[]` = `{ productName, notes }` only — **no qty** |
| Field visit reps | `FIELD_VISIT_USERNAMES`: nouman, javeria, aslam, ahtisham |

### Gap

- Sample liquid is prepared and registered by Esha but **not separated** from PO dispatch pool.
- Field visit sample delivery **does not reduce** any production stock.
- Risk: Rashid could assign sample-only batches to customer POs.

### Recommended design

#### 1. `productionPurpose` on `ProductionBatch`

```ts
productionPurpose: "regular" | "sample"  // default "regular"
```

- **Regular** — existing behavior (Rashid assignment, filling waste, admin reports).
- **Sample** — visible to Esha; **excluded** from Rashid PO batch-assignment pool and regular dispatch queries.

Reuse pattern from `batchKind` (standard / custom_box).

#### 2. Sample pool math

Per batch family / product name (same matching as `productsMatch` + `batchFamily`):

- `availableLiters = totalLiters − usedLiters − sampleDrawnLiters`
- `sampleDrawnLiters` incremented on field visit **outgoing** `record_sample_event`.

Store cumulative draw on batch via **`sampleLitersDrawn`** field **or** a small `SampleProductionMovement` audit collection (preferred for traceability — who, which visit, liters).

**v1 deduction rule:** each `sampleProducts` line = **1 bottle** unless we add `bottles` field (recommended in this phase). Liters = `bottles × litersPerBottle` from catalog.

**Allocation:** FIFO across sample batches for matching `batchFamily` (oldest `preparedAt` first).

#### 3. Field visit hook

On `record_sample_event` when `sampleMode === "outgoing"`:

1. Resolve liters per product from catalog.
2. Call `deductSampleProduction({ products, visitTicketId, actor })`.
3. If insufficient stock → **400** with clear message (“Not enough sample Brighten — 2.5 L available, need 5 L”).
4. Save movement audit rows.

Do **not** deduct on `request_sample_approval` (approval is intent only).

#### 4. Esha UI

- `/production/batches` — **tabs or filter**: Regular | Sample production.
- New batch form — **purpose toggle** (default Regular).
- List shows badge **Sample** / **Regular**; sample rows show **remaining sample liters**.

#### 5. Visibility

| Role | Sees |
|------|------|
| Esha | Both pools; creates either |
| Rashid | Regular batches only (assign/filling) |
| Field reps | Sample stock hint on delivery step (optional banner) |
| Waleed admin | Sample stock summary on field visit approval card (nice-to-have v1) |

#### 6. Out of scope (v1)

- Deducting filled **ready bottle** stock for samples (liquid batch only).
- PO sample orders (`approvalStatus`) — separate workflow; still use loading sheet.
- Auto-reserve stock on Waleed approval (deduct only on delivery).

### Touchpoints

- `lib/models/ProductionBatch.ts`
- `lib/models/SampleProductionMovement.ts` (new)
- `lib/sampleProductionStock.ts` (new — pool, deduct, FIFO)
- `app/api/production-batches/route.ts`, `[id]/route.ts`
- `app/(app)/production/batches/*`
- `lib/productionBatchStatus.ts` — exclude sample from regular “available” if needed
- Batch assignment API / `lib/readyBatchPool.ts` — filter `productionPurpose !== "sample"`
- `app/api/field-visits/[id]/route.ts` — `record_sample_event`
- `lib/models/FieldVisitTicket.ts` — optional `bottles` on `sampleProducts`
- `components/FieldVisitDetailForm.tsx` — qty per sample line (default 1)
- README + STATE

### Test scenarios

1. Esha registers **sample** Brighten batch 100 L → regular Rashid pool unchanged.
2. Esha registers **regular** Brighten batch → Rashid can assign to PO.
3. Rep delivers outgoing sample (2 products × 1 bottle) → sample pool − liters; movement audit row.
4. Insufficient sample stock → delivery blocked with message.
5. `record_sample_event` incoming mode → no sample deduction.

### Dependencies

- Phase 24 field visits (complete)
- Phase 08 batch registry (complete)
- Catalog `litersPerBottle` for conversion
