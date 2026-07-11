# 01-SUMMARY — Role, schema & validation

**Status:** Complete

## What was built
- Added `account_opener` role to `lib/roles.ts` (`AppRole`, `ALLOWED_ROLES`), plus `homePathForRole` → `/accounts/open`, and helpers `canOpenCustomerAccounts` / `canViewCustomerAccounts`.
- New `lib/models/CustomerAccount.ts` — company name, `directoryCode` link, tax status (filer/non_filer with ntn/strn), contract status (contract/non_contract with description), address, city, contact person, designation, email, phone, notes, active, createdBy fields; indexed on companyName/directoryCode/createdAt.
- New `lib/customerAccount.ts` — `parseCustomerAccountBody` (conditional validation: filer requires NTN+STRN, contract requires description, required company/address/contact/phone, email format), `serializeCustomerAccount`, and shared type/status constants.
- Seed user `accounts` / `Accounts-Open-01` (`account_opener`) in `scripts/seed-users.ts`.

## Notes
- Validation mirrored on client (`CustomerAccountForm`) and enforced authoritatively on the server.
