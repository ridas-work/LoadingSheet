# Phase 48 Research — Customer account opening

## Goal
Dedicated login for **account opening** staff to register new customers with tax/contract/contact details. Saved accounts **auto-appear** in the PO customer picker (and field-visit customer lists).

## Current state
- `CustomerDirectory` model: `{ code, name, active, addedBy* }` only — no tax/contract/contact fields.
- `upsertCustomerDirectory(name)` called from field visits when saving customer name.
- `canUseCustomerDirectory` role helper exists but **new-order page is still a plain text input** (no dropdown yet).
- Roles: `po_creator`, `batch_editor`, `dispatch_editor`, etc. — no account-opener role.
- Users seeded via `scripts/seed-users.ts`.

## Recommended design

### New role: `account_opener`
- Home route: `/accounts/open` (form) + `/accounts` (list of opened accounts, read-only history).
- Waleed admin can view all accounts; account opener creates only.
- Seed user e.g. `accounts` / `Accounts-Open-01` (configurable in seed script).

### New model: `CustomerAccount` (separate from slim directory row)
Keeps directory fast for dropdowns; full record for account opening.

| Field | Type | Notes |
|-------|------|-------|
| `companyName` | string | Required; synced to `CustomerDirectory.name` |
| `taxStatus` | `filer` \| `non_filer` | Radio |
| `ntn` | string | Required if filer |
| `strn` | string | Required if filer |
| `contractStatus` | `contract` \| `non_contract` | Radio |
| `contractDescription` | string | Required if contract |
| `address` | string | Required |
| `city` | string | Required (reused on PO) |
| `contactPerson` | string | Required |
| `designation` | string | Optional |
| `email` | string | Optional, validated format |
| `phone` | string | Required |
| `notes` | string | Optional internal notes |
| `directoryCode` | string | Link to `CustomerDirectory.code` |
| `createdByUserId`, `createdByName` | audit | |

### Validation rules
- Filer → NTN + STRN required (trim, reasonable max length).
- Non-filer → NTN/STRN cleared and not stored.
- Contract → `contractDescription` required (min length).
- Non-contract → description empty.
- Duplicate company name: allow upsert to existing directory entry (case-insensitive match) but warn if full account already exists.

### On create (transactional)
1. Validate body.
2. `upsertCustomerDirectory(companyName, actor)` → get `directoryCode`.
3. Create `CustomerAccount` with all fields + `directoryCode`.
4. Return account + directory entry.

### PO / field visit integration
- Add `GET /api/customer-directory` → `{ customers: [{ code, name, city? }] }` (city from latest account if available).
- **New order page**: replace plain customer input with **ComboField** (datalist) loading directory; selecting a customer fills `customerName` (+ optional `city` if stored on account).
- Field visit form: same datalist for customer name (optional enhancement in plan 04).

### Nav
- Account opener: **Open account** + **My accounts** (list).
- Admin: **Customer accounts** under admin nav (read-only list + search).

### Out of scope (v1)
- Waleed approval workflow for new accounts (instant publish to directory).
- Editing accounts after creation (read-only list; admin can add edit later).
- NTN/STRN format validation beyond non-empty (can add regex later).

## Files to touch
- `lib/models/CustomerAccount.ts` (new)
- `lib/customerAccount.ts` (parse/validate/serialize)
- `lib/roles.ts`, `app/(app)/layout.tsx`
- `app/api/customer-accounts/route.ts`, `app/api/customer-directory/route.ts`
- `app/(app)/accounts/open/page.tsx`, `app/(app)/accounts/page.tsx`
- `components/CustomerAccountForm.tsx`
- `app/(app)/new-order/page.tsx` — customer datalist
- `scripts/seed-users.ts` — new user

## Risks
- Plain-text NTN/STRN in Mongo — acceptable for internal app; no public exposure.
- Name collisions: use existing `upsertCustomerDirectory` dedupe by name.
