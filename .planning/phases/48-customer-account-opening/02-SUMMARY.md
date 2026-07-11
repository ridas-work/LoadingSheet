# 02-SUMMARY — Customer account & directory APIs

**Status:** Complete

## What was built
- `app/api/customer-accounts/route.ts`
  - `POST` — `canOpenCustomerAccounts` guard, `parseCustomerAccountBody` validation, `upsertCustomerDirectory(companyName)` to auto-create the directory row, then creates `CustomerAccount` with `directoryCode` + creator info. Returns field-level errors on 400.
  - `GET` — opener sees own accounts, admin sees all; newest first, limit 500.
- `app/api/customer-directory/route.ts`
  - `GET` — allowed for `canCreateOrders` (PO reps + field visit reps) and `canOpenCustomerAccounts`; returns `{ customers: [{ code, name, city? }] }`.
- `lib/customerDirectoryStore.ts`
  - `CustomerDirectoryEntry` gained optional `city`.
  - `listCustomerDirectory` now enriches each active directory row with the latest linked `CustomerAccount` city (for PO city prefill).

## Verification
- `npm run build` passes; both routes appear in the route manifest.
- Saving an account upserts the directory row (same company name) so it is immediately visible via `/api/customer-directory`.
