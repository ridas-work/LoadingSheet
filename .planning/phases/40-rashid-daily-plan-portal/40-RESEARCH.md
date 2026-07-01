# Phase 40 Research — Rashid daily plan portal (end-of-day status)

## RESEARCH COMPLETE

### User workflow (requested)

1. **Waleed (admin)** creates the **morning plan** at `/admin/rashid-daily-plan` — helpers, product tasks, targets, end-of-day duty assignments.
2. Plan is **visible in Rashid’s portal** the same day (read-only targets; no morning-plan edits).
3. **Rashid** enters **end-of-day status** per employee row — how much each person achieved vs **effective target** (base + carry-in).
4. Rashid **saves** → day marked **closed**; **carry forward** (`carryOut`) stored per line.
5. **Next day** Waleed opens a new morning plan → **carry-in** auto-fills from yesterday’s closed plan for matching `lineKey` (employee + product task or duty).

### What already exists (Phases 31 + 37)

| Piece | Status |
|-------|--------|
| Mongo `RashidDailyPlan` model | ✓ `workRows`, `duties`, `dayStatus: planned \| closed` |
| Carry math | ✓ `computeLineMetrics`, `carryInForLine` (only if previous day **closed**) |
| Waleed morning plan form | ✓ `/admin/rashid-daily-plan/new`, `[date]/edit` |
| Waleed status form | ✓ `/admin/rashid-daily-plan/[date]/status` + `PATCH` API |
| Waleed plan view | ✓ `/admin/rashid-daily-plan/[date]` |
| Rashid portal route | ✗ **Missing** |
| Rashid API access | ✗ All routes `isAdmin(role)` only |
| Rashid nav link | ✗ Batch operator nav has Trips, Filling, Ready stock — no daily plan |

### Gap analysis

**Root cause:** End-of-day recording was built on **admin routes** (`/api/admin/rashid-daily-plan`). Rashid (`dispatch_editor`, username ≠ `ali`) cannot call them.

**Carry-in chain already works** when Rashid (or Waleed) closes the day via PATCH — `applyStatusUpdates` writes `carryOut`; next morning `buildWorkRowsFromInputs` reads previous closed plan. No schema change required.

### Recommended architecture

**Roles** (`lib/roles.ts`):

- `canViewRashidDailyPlan(role, username)` — `isDispatchBatchOperator` OR admin
- `canRecordRashidDailyPlanStatus(role, username)` — same (Rashid closes day; Waleed can still use admin UI)
- `canEditRashidMorningPlan(role)` — admin only (existing)

**API** — new dispatch-scoped routes (keeps admin surface unchanged):

| Method | Route | Who | Action |
|--------|-------|-----|--------|
| GET | `/api/dispatch/daily-plan?date=` | Rashid, admin | Read plan for date (no list=1 needed for v1) |
| GET | `/api/dispatch/daily-plan?list=1` | Rashid | Last 14 plans summary (date, helper, status) |
| PATCH | `/api/dispatch/daily-plan` | Rashid, admin | End-of-day status only (reuse `applyStatusUpdates`) |

Implementation: thin wrappers calling shared helpers from `lib/rashidDailyPlan.ts` + same `RashidDailyPlan` model. **Do not** expose PUT (morning plan) on dispatch API.

**UI** — Rashid pages under `/dispatch/daily-plan`:

| Page | Purpose |
|------|---------|
| `/dispatch/daily-plan` | Today’s plan card + link to record status; list recent days |
| `/dispatch/daily-plan/[date]` | Read-only morning plan (targets, carry-in, effective, duties) |
| `/dispatch/daily-plan/[date]/status` | Status entry form (reuse `RashidDailyPlanStatusForm` with `apiBase`) |

Refactor `RashidDailyPlanStatusForm` to accept optional `apiBase` prop (`/api/admin/rashid-daily-plan` vs `/api/dispatch/daily-plan`) and `redirectBase` (`/admin/...` vs `/dispatch/...`).

**Nav** — add for `batchOperator` only:

```tsx
<AppNavLink href="/dispatch/daily-plan" label="Daily plan" />
```

**Home path** — optional: Rashid lands on `/dispatch/daily-plan` when today has a **planned** (not closed) morning plan; else keep `/dispatch/trips`. Defer to plan 03 if scope tight — nav link is minimum.

### Authorization rules

- Rashid **cannot** create or edit morning plan (no PUT).
- Rashid **can** PATCH status only when `dayStatus === "planned"` and morning plan exists (`saved`).
- Rashid **can** re-open/update status if day already closed? **v1: allow PATCH** (same as admin status page) so corrections don’t require Waleed.
- Rashid **cannot** see Waleed admin list of all historical plans beyond short list (14 days).

### lineKey / carry-in matching

Carry-in matches on `lineKey`:

- Product task: `{employeeId}::{productCode}::{taskCode}`
- Manual duty: `{employeeId}::{slugify(duty)}`

Waleed must use **same employee + same task/duty** on consecutive days for carry to apply — already documented on admin form. Rashid portal should **show carry-in column** on read-only view so floor staff see why effective target increased.

### Files to touch

- `lib/roles.ts` — new permission helpers
- `app/api/dispatch/daily-plan/route.ts` — new
- `app/(app)/dispatch/daily-plan/page.tsx` — list + today
- `app/(app)/dispatch/daily-plan/[date]/page.tsx` — read-only view
- `app/(app)/dispatch/daily-plan/[date]/status/page.tsx` — status
- `components/RashidDailyPlanStatusForm.tsx` — apiBase prop
- `components/RashidDailyPlanDispatchView.tsx` — optional thin wrapper or reuse `RashidDailyPlanView` with flags
- `app/(app)/layout.tsx` — nav
- `README.md` — Rashid daily plan workflow one-liner

### Out of scope

- Push notifications when Waleed saves morning plan
- Rashid editing helpers or targets
- Phase 39 Glim no-batch
- Moving admin UI off `/admin/rashid-daily-plan`

### Test scenarios (UAT)

1. Waleed saves morning plan for today → Rashid sees it on `/dispatch/daily-plan`.
2. Rashid enters status, saves → day **closed**; carry-out visible.
3. Waleed creates **tomorrow** plan for same employee+task → **carry-in** = yesterday carry-out; effective target updates.
4. Rashid cannot access `/admin/rashid-daily-plan` (redirect or 403).
5. No morning plan → Rashid sees empty state “Waiting for Waleed’s plan”.
