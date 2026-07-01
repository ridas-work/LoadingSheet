# Phase 31 — Research: Waleed Rashid daily production plan

## Source document

User referenced **`210526 Plan Rashid 2.docx`** (local `D:\` path — **not uploaded to server**). Planning below follows the user’s verbal spec:

- **Waleed (admin)** enters the sheet in the portal (not Rashid).
- **Date** picker.
- **Helper of the day** — dropdown from employee roster (full name list to be supplied by user).
- **Target / Status / Carry-on** math: e.g. target **1000**, status **700** → **300 carry-on** rolls to the **next working day**.
- **Last three duty rows** — each assigned via employee dropdown:
  1. Box making  
  2. Machine cleaning  
  3. Hall organization  

## Relationship to existing Rashid features

| Existing feature | Scope | This phase |
|------------------|-------|------------|
| `/dispatch/filling` | Rashid logs **bottles/liters per Nimra batch** | **Different** — supervisor daily plan / targets |
| Loading sheet **Helper** | Per **vehicle trip** text field | **Different** — production floor helper-of-the-day |
| Admin summary | PO grid | Add new **Rashid daily plan** page under admin |

No merge with `BatchFillingDailyEntry` in v1 — avoids mixing liter reconciliation with carton/bottle **plan targets**.

## Recommended v1 data model

### `ProductionEmployee` roster (JSON seed v1)

`data/production-employees.json`:

```json
[
  { "id": "emp-001", "name": "TBD — add names from Waleed" }
]
```

Admin can extend via seed script when user supplies names. Optional v2: admin UI to edit roster.

### `RashidDailyPlan` (MongoDB, one document per calendar date)

| Field | Type | Notes |
|-------|------|-------|
| `planDate` | `Date` (date only) | Unique index `YYYY-MM-DD` |
| `helperEmployeeId` | string | From roster |
| `helperName` | string | Denormalized display |
| `productionLines` | array | See below — **start with 1 line**; extend when Word layout confirmed |
| `duties.boxMaking` | `{ employeeId, employeeName }` | |
| `duties.machineCleaning` | `{ employeeId, employeeName }` | |
| `duties.hallOrganization` | `{ employeeId, employeeName }` | |
| `recordedByUserId`, `recordedByName` | audit | Waleed |
| `createdAt`, `updatedAt` | | |

**Production line shape** (repeatable if Word has multiple SKU rows):

| Field | Editable | Notes |
|-------|----------|-------|
| `lineKey` | seed/default | e.g. `main`, or product slug when multi-line |
| `label` | yes | Row label on sheet |
| `baseTarget` | yes | Daily base target (e.g. 1000) |
| `carryIn` | **read-only** | From previous day’s `carryOut` for same `lineKey` |
| `statusAchieved` | yes | Actual done today (e.g. 700) |
| `effectiveTarget` | computed | `baseTarget + carryIn` |
| `carryOut` | computed | `max(0, effectiveTarget − statusAchieved)` → **300** in example |

### Carry-forward rules (v1)

```text
effectiveTarget = baseTarget + carryIn
carryOut        = max(0, effectiveTarget - statusAchieved)
nextDay.carryIn = previousDay.carryOut   (same lineKey)
```

- **First day** (no prior plan): `carryIn = 0`.
- **Weekends / gaps**: use **previous calendar day** that has a saved plan, or strictly **previous calendar day** only — **recommend calendar previous day**; if missing, `carryIn = 0` (document in README).
- **Validation**: `statusAchieved ≥ 0`, `baseTarget ≥ 0`, integers preferred (bottles/cartons — confirm unit label with Waleed at UAT).

## API sketch

| Method | Path | Role |
|--------|------|------|
| GET | `/api/admin/production-employees` | admin — roster for dropdowns |
| GET | `/api/admin/rashid-daily-plan?date=YYYY-MM-DD` | admin — plan + computed carryIn |
| PUT | `/api/admin/rashid-daily-plan` | admin — upsert plan for date |

GET response includes:

- `carryInByLine` resolved from prior saved plan  
- computed `effectiveTarget`, `carryOut` per line  
- `previousPlanDate` (if any) for UI hint  

## UI sketch (`/admin/rashid-daily-plan`)

Waleed-only nav link **Rashid daily plan** (admin header).

```
┌─────────────────────────────────────────────────────────┐
│ Date [____]   Helper of the day [dropdown ▼]            │
├─────────────────────────────────────────────────────────┤
│ Production target          │ Base │ Carry in │ Effective│
│ (label editable v1)        │ 1000 │   300*   │  1300    │
│ Status achieved            │      │          │   700    │
│ Carry to next day          │      │          │   300    │
├─────────────────────────────────────────────────────────┤
│ Box making          [employee ▼]                        │
│ Machine cleaning    [employee ▼]                        │
│ Hall organization   [employee ▼]                        │
├─────────────────────────────────────────────────────────┤
│ [Save plan]                                             │
└─────────────────────────────────────────────────────────┘
* carryIn read-only, loaded from previous day
```

- Date change → reload plan or blank form with carryIn prefilled.  
- Save → upsert; show success toast.  
- Optional: list last 7 days below (read-only links) — **defer to v2** unless time in plan 03.

## Open questions for UAT (Word doc upload)

1. **Multiple production rows** in Word (per product) vs **one aggregate row**? v1 ships **one line** + schema supports many.  
2. **Unit label** — bottles, cartons, or “pieces”? Show as **Target (units)** in UI.  
3. **Default base target** — always 1000 or varies by day? User enters manually.  
4. **Employee list** — user will provide; block execute plan 01 until names added OR seed placeholders.

## Files to touch (summary)

- `data/production-employees.json`
- `lib/models/RashidDailyPlan.ts`
- `lib/rashidDailyPlan.ts` — carry math + date helpers
- `app/api/admin/rashid-daily-plan/route.ts`
- `app/api/admin/production-employees/route.ts`
- `app/(app)/admin/rashid-daily-plan/page.tsx`
- `components/RashidDailyPlanForm.tsx`
- `app/(app)/layout.tsx` — admin nav link
- `README.md`

## PLANNING COMPLETE
