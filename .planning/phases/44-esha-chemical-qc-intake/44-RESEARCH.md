# Phase 44 Research — Esha chemical QC intake + approve deduct

## RESEARCH COMPLETE

### User request

1. **Chemical arrives at company** → **Esha** performs QC, enters **quantity** and **QC results** → material appears in **Ramazan’s portal** with updated stock.
2. **Ramazan** requests a chemical (existing flow).
3. **Waleed** approves the request → **quantity deducts** from stock.
4. If **insufficient stock** at approve time → **error**: cannot approve due to shortage → Waleed must **refill** stock (Esha intake or admin adjust), then approve.

### What exists today (Phase 38)

| Area | Current behavior |
|------|------------------|
| Catalog | `data/chemical-raw-materials.json` — ~280 materials, seeded to `ChemicalRawMaterial` |
| Ramazan | `/chemicals/inventory` — search, **manually edit onHand**, submit request |
| Waleed | `/admin/chemical-requests` — **Approve** / Reject / Mark ordered |
| Stock on approve | **No deduction** — approve is status-only |
| Esha | **No** chemical intake — production batches only |
| Roles | `chemicals_editor` (Ramazan), `admin` (Waleed), `batch_editor` (Esha) |

### Gap

| Gap | Fix |
|-----|-----|
| Stock entered by Ramazan manually | **Esha QC intake** increases `onHand` |
| Approve does not reduce stock | **Deduct on approve** atomically |
| No shortage guard | **Block approve** when `onHand < quantityRequested` |
| No intake audit | **ChemicalIntake** + **ChemicalStockMovement** ledger |

### Recommended design

#### 1. Esha chemical intake (`batch_editor`)

New route: **`/production/chemical-intake`** (Esha home nav link).

Form per delivery:
- **Material** — search/select from `ChemicalRawMaterial` catalog
- **Quantity received** (kg, matches material unit)
- **QC outcome** — Successful / Unsuccessful (like production batches)
- **QC fields** (v1): appearance, pH, solids, provider, notes (reuse patterns from `ProductionBatchForm` where sensible)
- **Received date** (default today)

On **Successful**:
- `ChemicalRawMaterial.onHand += quantity`
- Create `ChemicalIntake` record (audit)
- Create `ChemicalStockMovement` type `intake`

On **Unsuccessful**:
- `ChemicalIntake` only — **no** stock change

List page: recent intakes (read-only history).

#### 2. Ramazan portal changes

`/chemicals/inventory`:
- **Stock available** — **read-only** (remove Ramazan PATCH onHand)
- **Request** — unchanged
- Optional: show “Last intake” date from movements

Ramazan cannot add stock — only Esha intake (+ Waleed admin adjust).

#### 3. Waleed approve with shortage check

`PATCH /api/admin/chemical-material-requests/[id]` action `approve`:

```
if material.onHand < request.quantityRequested:
  return 400 "Cannot approve — insufficient stock. On hand: X kg, requested: Y kg. Record a new intake (Esha) or adjust stock first."
else:
  material.onHand -= quantityRequested
  request.status = approved
  movement type request_approved
```

Use **transaction** or findOneAndUpdate with condition `onHand >= qty` to avoid race.

**Mark ordered** — keep as post-approve fulfillment step; **no second deduct**.

#### 4. Waleed refill paths

| Path | Who | When |
|------|-----|------|
| Esha intake | Esha | New chemical delivery QC pass |
| Admin stock adjust | Waleed | `/chemicals/inventory` read-only view + admin adjust modal, or reuse existing admin PATCH |

Show **current onHand** on admin request row when approving (not only `onHandAtRequest` snapshot).

#### 5. Schema additions

**`ChemicalIntake`**
```ts
materialCode, materialName, quantity, unit,
qcOutcome: "approved" | "rejected",
appearance, ph, solids, provider, notes,
receivedAt, recordedByUserId, recordedByName
```

**`ChemicalStockMovement`**
```ts
materialCode, type: "intake" | "request_approved" | "admin_adjust",
quantityDelta,  // + for intake, - for approve
onHandAfter,
referenceId, referenceKind,
recordedByName, recordedAt
```

#### 6. Roles (extend `lib/roles.ts`)

| Function | Roles |
|----------|-------|
| `canRecordChemicalIntake` | `batch_editor`, `admin` |
| `canEditChemicalStock` | **`admin` only** (remove Ramazan direct edit) |
| `canRequestChemicalMaterials` | `chemicals_editor` (unchanged) |
| `canReviewChemicalRequests` | `admin` (unchanged) |

#### 7. Distinction from production batches

| | Production batch (Esha) | Chemical intake (Esha) |
|---|-------------------------|-------------------------|
| Purpose | Liquid for filling / dispatch | Raw chemical stock for factory |
| Pool | Rashid PO assignment | Ramazan request / Waleed approve |
| Model | `ProductionBatch` | `ChemicalIntake` + `ChemicalRawMaterial.onHand` |

### Touchpoints

- `lib/models/ChemicalIntake.ts`, `ChemicalStockMovement.ts` (new)
- `lib/chemicalStock.ts` — `applyIntake`, `applyRequestDeduction`, `validateApproveStock`
- `app/api/chemical-intakes/route.ts` (new)
- `app/(app)/production/chemical-intake/page.tsx` (new)
- `components/ChemicalIntakeForm.tsx` (new)
- `components/ChemicalMaterialsPortal.tsx` — read-only stock for Ramazan
- `app/api/admin/chemical-material-requests/[id]/route.ts` — shortage + deduct
- `components/AdminChemicalRequestsTable.tsx` — show live onHand, shortage errors
- `app/(app)/layout.tsx` — Esha nav link

### Out of scope (v1)

- Partial approve (approve less than requested)
- Auto-notify Ramazan on intake
- Supplier PO integration
- Rashid access to chemicals

### Risks

- Legacy `onHand` set by Ramazan — freeze manual edit; existing values remain until next intake/adjust
- Concurrent approve + intake — use atomic `$inc` with floor at 0 or conditional update
