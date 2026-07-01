# Phase 43 Research — Esha close batch + waste

## RESEARCH COMPLETE

### User request

**Esha portal** (`batch_editor`, user `esha`) needs to **close** a production batch when work is finished:

1. Review / check the batch record.
2. Confirm waste and **enter waste amount** (liters left over).
3. **Close** the batch → moves to **Closed batches** (new route/tab).
4. Closed batches are **read-only forever** — detail view only, no edit.

### What exists today

| Area | Current behavior |
|------|------------------|
| `ProductionBatch` | `qcOutcome`: approved / rejected / discarded; no `closedAt` |
| `nimraWasteLiters` | Set only on **discard** (full batch written off after QC failure) |
| Esha list | `/production/batches` — All / Regular / Sample tabs; all open batches |
| Esha detail | `/production/batches/[id]` — audit view + Edit link |
| Esha edit | `/production/batches/[id]/edit` — full form; discard only when `qcOutcome === rejected` |
| Rashid pool | Assignable batches = approved, not discarded, not empty; no close filter |
| Rashid filling | `BatchFillingDailyEntry.wasteLiters` — floor waste per day (separate from Esha close) |

### Gap

- No **normal end-of-life** for a successful batch (partial or full use on POs, then leftover waste).
- **Discard** is QC-failure only (rejected → discard entire pool).
- Active list never hides “finished” batches — Esha sees old batches mixed with live ones.
- No immutable closed archive.

### Recommended design

#### 1. Closure fields on `ProductionBatch`

```ts
closedAt: Date | null          // null = open/active
closedByUserId: string | null
closedByName: string
closureWasteLiters: number | null   // liters Esha records as waste at close
closureWasteNote: string            // optional note
closureUsedLitersSnapshot: number   // used liters at close time (audit)
closureRemainingLitersSnapshot: number
```

- **Open batch:** `closedAt == null`
- **Closed batch:** `closedAt` set; excluded from Rashid assignment pool and Esha active tabs

Reuse naming pattern from `nimraWaste*` / `qcStatus*` audit fields.

#### 2. Close rules (v1)

| Rule | Detail |
|------|--------|
| Who | `batch_editor` only (Esha) |
| QC state | Only **`approved`** batches can be closed (not rejected — use discard path; not discarded) |
| Already closed | 400 — immutable |
| Waste input | Required number `>= 0`; must be `<= remainingLiters` at close time (with small float tolerance) |
| Partial use OK | Batch may have `usedLiters > 0` on loading sheets / filling — close records leftover waste |
| Sample batches | Same close flow; sample pool stops accepting new draws after close |

#### 3. Pool / assignment after close

- Add `openProductionBatchMongoFilter()` → `{ closedAt: null }` (and existing `qcOutcome !== discarded` where applicable).
- Apply to: batch-assignments API, `readyBatchPool`, production batch list default tabs, Rashid-facing queries.
- Closed batches: **zero** remaining for assignment (`remainingLiters` treated as 0 even if snapshot shows history).

#### 4. Routes / UI

| Route | Purpose |
|-------|---------|
| `/production/batches` | Active tabs only — **exclude** `closedAt != null` |
| `/production/batches/closed` | **New** — closed batch list (read-only archive) |
| `/production/batches/[id]` | Open: detail + **Close batch** CTA; Closed: read-only detail + closure/waste block |
| `/production/batches/[id]/edit` | Redirect to detail if `closedAt` set |

**Close flow UI** (on detail page or modal):

- Show batch summary + used / remaining liters.
- Checkbox: “I have checked this batch.”
- Number input: **Waste (L)** — default prefill = remaining liters (editable).
- Optional note.
- **Close batch** button → `POST` or `PATCH` close API → redirect to `/production/batches/closed`.

Nav: add **Closed batches** link next to existing tabs (Esha + admin read-only).

#### 5. API

`POST /api/production-batches/[id]/close`

Body: `{ wasteLiters: number, note?: string, confirmed: true }`

Server: recompute usage, validate, set closure fields + `closedAt`, return serialized batch.

#### 6. Distinction: close vs discard

| | **Close** | **Discard** |
|---|-----------|-------------|
| When | Production finished; pool exhausted or leftover waste | QC failed after reject |
| QC | Approved | Rejected → discarded |
| Waste | User-entered leftover (≤ remaining) | Full `totalLiters` |
| List | Closed batches archive | Stays discarded; hidden from assign |
| Edit after | No | No |

#### 7. Admin / Rashid

- **Waleed (admin):** read-only on closed list + detail (oversight).
- **Rashid:** does not close batches; closed batches never appear in assignment picker.

### Touchpoints

- `lib/models/ProductionBatch.ts`
- `lib/productionBatchStatus.ts` — `openProductionBatchMongoFilter()`, closed usage = 0 remaining
- `lib/sampleProductionStock.ts` — exclude closed sample batches
- `lib/readyBatchPool.ts`, batch-assignments API
- `app/(app)/production/batches/page.tsx` — filter open only
- `app/(app)/production/batches/closed/page.tsx` — **new**
- `app/(app)/production/batches/[id]/page.tsx` — close panel + closed read-only
- `app/(app)/production/batches/[id]/edit/page.tsx` — block closed
- `app/api/production-batches/[id]/close/route.ts` — **new**
- `components/ProductionBatchCloseForm.tsx` — **new** (client)
- `components/ProductionBatchRowActions.tsx` — hide Edit when closed

### Out of scope (v1)

- Re-open closed batch.
- Waleed override close.
- Auto-close when remaining = 0 without Esha action.
- Merging close waste into Rashid daily filling grid (separate systems).

### Risks

- Legacy batches without `closedAt` remain “open” until Esha closes them manually — acceptable; optional one-time admin script deferred.
- Float tolerance on waste vs remaining — use `roundLiters` and allow ≤ 0.001 L epsilon.
