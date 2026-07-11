---
wave: 2
depends_on: ["53-market-visit-no-alerts/01-PLAN.md"]
files_modified:
  - components/MarketVisitForm.tsx
  - app/globals.css
autonomous: true
---

# Plan 03 — Red cell UI and cross-visit reminders

## Objective

Show **red** on N cells and on carried-over open alerts when Aslam/Ahtisham revisit a store.

## Tasks

<task id="03-1">
In `MarketVisitForm.tsx`:
- State: `openAlertsByStoreKey: Record<string, string[]>`
- When `rows` change, debounce-fetch open alerts for store keys of rows with `storeName.trim()`
- Helper `cellAlertState(row, skuKey)` → `"no" | "open" | "ok"`
</task>

<task id="03-2">
Availability `<td>` / `<select>` styling:
- `"no"` → red background (`market-visit-cell-no`)
- `"open"` (carried alert, value not yes) → red background + optional small alert dot/title "Still out — fix when restocked"
- `"yes"` → normal/green tint optional
- Print: keep readable (red tint or bold N text)
</task>

<task id="03-3">
After successful save/submit, refresh `openAlertsByStoreKey` from response or re-fetch alerts API.
</task>

<task id="03-4">
Add CSS in `app/globals.css` for `.market-visit-cell-no` and `.market-visit-cell-open-alert` (screen only or light print).
</task>

## Verification

- [ ] Selecting N in dropdown turns cell red without save
- [ ] New visit + same store name shows red on SKUs open from prior visit
- [ ] Changing N→Y removes red and clears alert after save
- [ ] Facing table unaffected

## must_haves

- Immediate visual feedback on N selection
- Cross-visit red persists until Y saved
- Multiple open SKUs at one store can all show red independently
