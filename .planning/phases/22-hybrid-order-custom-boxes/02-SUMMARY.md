# Plan 02 — `/new-order` UI — complete

## Done

- **`components/CustomCartonBuilder.tsx`:** Repeatable cartons, content rows, `buildCustomCartonsPayload`, drafts from saved cartons.
- **`app/(app)/new-order/page.tsx`:** `customCartons` state; **Add custom carton**; validation aligned with server; submit body includes `customCartons`; mixed-sample mode clears custom cartons; `canSubmit` allows custom-only or standard-only or both.

## Verification

- `npm run build` passes.
