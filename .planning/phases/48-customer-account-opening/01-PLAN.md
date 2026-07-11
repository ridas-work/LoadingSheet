---
wave: 1
depends_on: []
gap_closure: false
files_modified:
  - "lib/models/CustomerAccount.ts"
  - "lib/customerAccount.ts"
  - "lib/roles.ts"
  - "scripts/seed-users.ts"
autonomous: true
---

<phase_goal>
Add **`account_opener`** role, **CustomerAccount** schema, and validation helpers for the account-opening form.
</phase_goal>

<must_haves>
- [ ] `AppRole` includes `account_opener`; `homePathForRole` → `/accounts/open`.
- [ ] `canOpenCustomerAccounts`, `canViewCustomerAccounts` helpers (opener + admin).
- [ ] `CustomerAccount` mongoose schema with all form fields + `directoryCode` link.
- [ ] `parseCustomerAccountBody` / `validateCustomerAccount` — conditional NTN/STRN and contract description.
- [ ] Seed user for account opener (e.g. username `accounts`).
</must_haves>

<tasks>
  <task id="T1" title="CustomerAccount model">
    <step>Create `lib/models/CustomerAccount.ts` with fields from RESEARCH.md.</step>
    <step>Index `companyName`, `directoryCode`, `createdAt`.</step>
  </task>

  <task id="T2" title="Validation helpers">
    <step>Create `lib/customerAccount.ts`: types, parse body, validate filer/contract conditionals, serialize for API.</step>
  </task>

  <task id="T3" title="Role + seed">
    <step>Add `account_opener` to `ALLOWED_ROLES`, `homePathForRole`, nav guards.</step>
    <step>Add seed user in `scripts/seed-users.ts`.</step>
  </task>
</tasks>

<verification>
- Types compile; `isAppRole("account_opener")` true.
- Validation rejects filer without NTN, contract without description.
</verification>
