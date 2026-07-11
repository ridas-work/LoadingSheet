# 03-SUMMARY — Account opener UI + nav

**Status:** Complete

## What was built
- `components/CustomerAccountForm.tsx` — client form with conditional fields (filer → NTN+STRN; contract → description), inline validation mirroring server rules, POST to `/api/customer-accounts`, success message + form reset for opening another.
- `app/(app)/accounts/open/page.tsx` — `canOpenCustomerAccounts` guard, renders the form.
- `app/(app)/accounts/page.tsx` — list of accounts (company, city, contact/phone, filer + contract badges, opened-by for admin, date); opener sees own, admin sees all.
- `app/(app)/layout.tsx` — nav: `account_opener` sees **Open account** + **Accounts**; admin sees **Customer accounts**.

## Verification
- `npm run build` passes; `/accounts` and `/accounts/open` render.
